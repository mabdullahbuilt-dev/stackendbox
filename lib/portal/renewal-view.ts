export const renewalBuckets = ["All", "Expired", "1–7 days", "8–14 days", "15–30 days", "31–60 days", "More than 60 days", "Expiry unverified"] as const;
export function renewalWindow(expiration: unknown, now = Date.now()) {
  const at=typeof expiration==="string"?Date.parse(expiration):NaN;
  if(!Number.isFinite(at))return {days:null,bucket:"Expiry unverified"};
  const days=Math.ceil((at-now)/86400000);
  return {days,bucket:at<=now?"Expired":days<=7?"1–7 days":days<=14?"8–14 days":days<=30?"15–30 days":days<=60?"31–60 days":"More than 60 days"};
}
export function customerMoney(amount:unknown,currency:unknown="usd") {
  if(typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<0)return "Quote required";
  if(typeof currency!=="string"||! /^[a-z]{3}$/i.test(currency))return "Quote required";
  try{return new Intl.NumberFormat("en-US",{style:"currency",currency:currency.toUpperCase()}).format(amount/100);}catch{return "Quote required";}
}
