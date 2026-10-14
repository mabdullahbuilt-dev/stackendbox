const origins=new Map([
  ['https://stackendbox-portal-preview.vercel.app',{vercelPreview:true,staticFrontend:false}],
  ['https://stackendbox-cf-acceptance.stackendbox.workers.dev',{vercelPreview:false,staticFrontend:false}],
  ['https://stackendbox-static-acceptance.stackendbox.workers.dev',{vercelPreview:false,staticFrontend:true}],
  ['https://stackendbox-production.stackendbox.workers.dev',{vercelPreview:false,staticFrontend:true}],
]);
export function hostedAcceptanceProfile(origin,{bounded=false,sessionCount}={}){
  const profile=origins.get(origin);
  if(!profile)throw new Error('Unapproved acceptance origin');
  const sessions=Number(sessionCount??(bounded?2:5));
  if(!Number.isInteger(sessions)||sessions<2||sessions>10)throw new Error('Hosted sessions must be between 2 and 10');
  return {...profile,sessions,apiPrefix:profile.staticFrontend?'/client-portal/api/':'/api/portal/'};
}
