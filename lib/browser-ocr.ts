import { parsePassportText, type PassportReading } from "./passport";

// Normalize the paper's lighting before reading the two machine-readable lines.
function prepareCanvas(image:HTMLImageElement,area:{x:number;y:number;width:number;height:number},threshold?:number) {
  const canvas=document.createElement("canvas");const scale=2400/area.width;
  canvas.width=2400;canvas.height=Math.round(area.height*scale);
  const context=canvas.getContext("2d");if(!context)throw new Error("This photo couldn't be opened. Choose another one.");
  context.drawImage(image,area.x,area.y,area.width,area.height,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);const histogram=new Uint32Array(256);
  for(let i=0;i<pixels.data.length;i+=4){const gray=Math.round(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114);pixels.data[i]=gray;histogram[gray]++;}
  const count=pixels.data.length/4;let cumulative=0,low=0,high=255;
  for(let i=0;i<256;i++){cumulative+=histogram[i];if(cumulative<count*.01)low=i;if(cumulative>=count*.99){high=i;break;}}
  for(let i=0;i<pixels.data.length;i+=4){let value=Math.max(0,Math.min(255,(pixels.data[i]-low)*255/Math.max(1,high-low)));if(threshold!==undefined)value=value>=threshold?255:0;pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value;}
  context.putImageData(pixels,0,0);return canvas;
}
const hasCoreFields=(result:PassportReading)=>!!(result.name&&result.nationality&&result.birthDate&&result.expiry);
export async function readPassportLocally(imageUrl:string,onProgress:(progress:number)=>void):Promise<PassportReading> {
  const {createWorker,PSM}=await import("tesseract.js");
  const image=new Image();image.src=imageUrl;await image.decode();
  const area={x:0,y:Math.round(image.height*.58),width:image.width,height:image.height-Math.round(image.height*.58)};
  const canvas=prepareCanvas(image,area);let phase=0;
  const worker=await createWorker("eng",1,{workerPath:"/ocr/worker.min.js",corePath:"/ocr",langPath:"/ocr",cacheMethod:"none",workerBlobURL:false,logger:message=>{if(message.status==="recognizing text")onProgress(Math.round(30+phase*15+message.progress*15));else if(phase===0)onProgress(Math.round(message.progress*25));}});
  try {
    await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",preserve_interword_spaces:"0"});
    const mrz=await worker.recognize(canvas,{}, {text:true,blocks:true});let text=mrz.data.text;let result=parsePassportText(text);
    if(!hasCoreFields(result)) {
      // Locate an MRZ line, then retry it alone with the background removed.
      const lines=mrz.data.blocks?.flatMap(block=>block.paragraphs.flatMap(paragraph=>paragraph.lines))||[];
      const candidates=lines.filter(line=>line.text.replace(/\s/g,"").length>25&&!/^P[<A-Z]/.test(line.text.trim())).slice(-3);
      await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE});phase=1;
      const scale=canvas.width/image.width;
      for(const line of candidates){
        const x=Math.max(0,Math.floor(line.bbox.x0/scale)-10),y=Math.max(0,Math.floor(line.bbox.y0/scale)+area.y-10);
        const cropArea={x,y,width:Math.min(image.width-x,Math.ceil((line.bbox.x1-line.bbox.x0)/scale)+20),height:Math.min(image.height-y,Math.ceil((line.bbox.y1-line.bbox.y0)/scale)+20)};
        for(const threshold of [175,155]) {
          const crop=prepareCanvas(image,cropArea,threshold);
          try{const retry=await worker.recognize(crop);text+=`\n${retry.data.text}`;result=parsePassportText(text);}finally{crop.width=0;crop.height=0;}
          if(hasCoreFields(result))break;
        }
        if(hasCoreFields(result))break;
      }
    }
    if(!hasCoreFields(result)) {
      phase=3;await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,tessedit_char_whitelist:""});
      const full=await worker.recognize(imageUrl,{rotateAuto:true});result=parsePassportText(`${text}\n${full.data.text}`);
    }
    if(!result.name&&!result.birthDate&&!result.expiry)throw new Error("Use a straight, close-up photo with both bottom lines visible.");
    onProgress(100);return result;
  }finally{await worker.terminate();canvas.width=0;canvas.height=0;image.src="";}
}
