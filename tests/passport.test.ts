import {test} from "node:test";
import assert from "node:assert/strict";
import {mrzCheckDigit,parsePassportText} from "../lib/passport";

// Fictional document: never use a real passport as a test fixture.
const number="AB1234567",birth="990415",expiry="340620",personal="<<<<<<<<<<<<<<";
const first="P<USADOE<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<";
const second=`${number}${mrzCheckDigit(number)}USA${birth}${mrzCheckDigit(birth)}F${expiry}${mrzCheckDigit(expiry)}${personal}${mrzCheckDigit(personal)}`;
const mrz=`${first}\n${second}${mrzCheckDigit(second.slice(0,10)+second.slice(13,20)+second.slice(21,43))}`;

test("MRZ extracts an editable name, birth date and expiry from a fictional passport",()=>{
  const reading=parsePassportText(mrz);
  assert.equal(reading.name,"JANE DOE");assert.equal(reading.birthDate,"1999-04-15");assert.equal(reading.expiry,"2034-06-20");
  assert.deepEqual(reading.checks,{number:true,birth:true,expiry:true,composite:true});assert.equal(reading.warnings.length,0);
});
test("dates work without a readable passport number or complete filler tail",()=>{
  const damaged=`${first}\nXXXXXXXXX0${second.slice(10,28)}<<<`;
  const reading=parsePassportText(damaged);
  assert.equal(reading.name,"JANE DOE");assert.equal(reading.birthDate,"1999-04-15");assert.equal(reading.expiry,"2034-06-20");assert.equal(reading.warnings.length,0);
});
test("ambiguous OCR dates with invalid checks stay empty for manual correction",()=>{
  const damaged=`${first}\n${second.slice(0,13)}9914150F${expiry}9<<<<`;
  const reading=parsePassportText(damaged);
  assert.equal(reading.name,"JANE DOE");assert.equal(reading.birthDate,"");assert.equal(reading.expiry,"");assert.equal(reading.warnings.length,2);
  assert.equal(parsePassportText("PASSPORT JAPAN").name,"");
});

test("nationality is readable even when OCR inserts digits into the dates",()=>{
  const damaged=`${first}\n${second.slice(0,13)}9${second.slice(13)}`;
  assert.equal(parsePassportText(damaged).nationality,"United States");
});
test("nationality comes from the holder's field, not the issuing state",()=>{
  assert.equal(parsePassportText(`${first}\n${second.replace('USA','GBR')}`).nationality,"United Kingdom");
  assert.equal(parsePassportText(`${first}\n${second.replace('USA','UPN')}`).nationality,"");
  assert.equal(parsePassportText("JAPAN PASSPORT\nP<JPNSMITH<<JANE<<<<<<<<<<<<").nationality,"");
});
test("labelled nationality text recovers a damaged MRZ country code",()=>{
  const damaged=`${first}\n${second.replace('USA','UPN')}\nNationality / Date of birth\nJAPAN 15 APR 1999`;
  assert.equal(parsePassportText(damaged).nationality,"Japan");
});
test("ISO countries and ICAO nationality exceptions are supported",()=>{
  assert.equal(parsePassportText(`${first}\n${second.replace('USA','NGA')}`).nationality,"Nigeria");
  assert.equal(parsePassportText(`${first}\n${second.replace('USA','D<<')}`).nationality,"Germany");
  assert.equal(parsePassportText(`${first}\n${second.replace('USA','GBN')}`).nationality,"British National (Overseas)");
});
test("visual nationality matching keeps the first field value ahead of later country names",()=>{
  assert.equal(parsePassportText("Nationality / Date of birth\nJAPAN 15 APR 1999\nPlace of birth UNITED STATES").nationality,"Japan");
});
