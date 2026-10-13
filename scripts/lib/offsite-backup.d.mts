import type {Readable} from 'node:stream';
export type BackupGeneration = {id:string;name:string;appProperties?:Record<string,string|undefined>};
export function sha256File(path:string):Promise<string>;
export function encryptStream(source:Readable,path:string,publicPem:string|Buffer):Promise<{bytes:number;sha256:string}>;
export function assertPrivatePermissions(permissions:{type:string;role:string;emailAddress?:string}[],email:string):void;
export function retirementCandidates(files:BackupGeneration[],keep?:number):BackupGeneration[];
export function verifiedRootCertificate():Promise<string>;
