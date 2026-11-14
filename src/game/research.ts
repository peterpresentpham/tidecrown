import { TECHNOLOGIES, type TechnologyId } from '../data/technologies';
import type { FactionId, State } from './engine';

export type ResearchStatusKind='ready'|'researching'|'complete'|'locked'|'unaffordable'|'waiting';
export type ResearchStatus={kind:ResearchStatusKind;label:string;reason:string|null;missing:TechnologyId[]};
/** One source of truth for the engine, labels and colors. Readiness includes the current turn and all costs. */
export function researchStatus(s:State,owner:FactionId,id:TechnologyId):ResearchStatus{
 const t=TECHNOLOGIES[id],done=s.technologies[owner],current=s.research[owner];
 const result=(kind:ResearchStatusKind,label:string,reason:string|null,missing:TechnologyId[]=[]):ResearchStatus=>({kind,label,reason,missing});
 if(!t)return result('locked','Không hợp lệ','Công nghệ không hợp lệ.');
 if(done.includes(id))return result('complete','Đã nghiên cứu','Đã nghiên cứu công nghệ này.');
 if(current?.technology===id)return result('researching','Đang nghiên cứu',`Còn ${current.remaining} lượt của bạn.`);
 const missing=t.requires.filter(req=>!done.includes(req));
 if(missing.length)return result('locked','Chưa mở',`Cần ${missing.map(req=>TECHNOLOGIES[req].name).join(' và ')}.`,missing);
 if(!s.cities.some(c=>c.owner===owner&&!c.stability&&c.job?.type!=='found'))return result('waiting','Chờ thành ổn định','Cần một làng đã ổn định.');
 const labels={gold:'vàng',food:'lương',wood:'gỗ',stone:'đá'};
 const shortfall=(Object.keys(labels) as (keyof typeof labels)[]).filter(k=>s.resources[owner][k]<t.cost[k]).map(k=>`${t.cost[k]-s.resources[owner][k]} ${labels[k]}`);
 if(shortfall.length)return result('unaffordable','Thiếu tài nguyên',`Còn thiếu ${shortfall.join(', ')}.`);
 if(s.winner)return result('waiting','Ván đã kết thúc','Ván chơi đã kết thúc.');
 if(current)return result('waiting','Chờ nghiên cứu',`Đợi ${TECHNOLOGIES[current.technology].name} hoàn tất (${current.remaining} lượt).`);
 if(s.turn!==owner)return result('waiting','Chờ lượt','Bắt đầu nghiên cứu khi tới lượt của bạn.');
 return result('ready','Nghiên cứu được',null);
}
