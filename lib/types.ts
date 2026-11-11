export type Listing={id:string;component_id:string;seller_id:string;title:string;category:string;brand:string;model:string;description:string;price:number;quantity:number;condition:string;city:string;specifications:Record<string,string>;test_procedure:string;tested_at:string;created_at:string;seller_name:string;status:string};
export type Device={id:string;owner_id:string;type:string;brand:string;model:string;defect:string;powers_on:string;physical_condition:string;unused_since:string;status:string;created_at:string};
export type Component={id:string;device_id:string;name:string;category:string;brand:string;model:string;status:string;condition:string;specifications:Record<string,string>;mass_grams:number;created_at:string};
export type Order={id:string;buyer_id:string;status:string;total:number;created_at:string;address:Record<string,string>};
export type Metrics={devices:number;evaluated:number;recovered:number;sold:number;reused_kg:number;recycled_kg:number;sent_kg:number;months:{month:string;devices:number;recovered:number}[]};
export const emptyMetrics:Metrics={devices:0,evaluated:0,recovered:0,sold:0,reused_kg:0,recycled_kg:0,sent_kg:0,months:[]};
