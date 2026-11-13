import fs from 'node:fs';import {createHash} from 'node:crypto';import {compareFrame as compareCore} from './visual-core.mjs';
export const policy=JSON.parse(fs.readFileSync(new URL('./visual-policy.json',import.meta.url)));
export const policyHash=createHash('sha256').update(JSON.stringify(policy)).digest('hex');
export const compareFrame=(native,remake,width,height,p=policy,workspace)=>compareCore(native,remake,width,height,p,workspace);
