export const categories = ['Todos','Memórias RAM','Armazenamento','Processadores','Placas de vídeo','Placas-mãe','Notebooks'];
export const deviceTypes = ['Computador','Notebook','Celular','Televisor','Monitor','Impressora','Periférico','Outro'];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;
export function validatePhotos(files) {
 if(files.length>MAX_PHOTOS) return 'Envie no máximo 6 fotografias.';
 if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type))) return 'Use imagens JPG, PNG ou WebP.';
 if(files.some(f=>f.size>MAX_PHOTO_BYTES)) return 'Cada imagem deve ter no máximo 5 MB.';
 return null;
}
export function passwordStrength(value) { return [value.length>=8,/[A-Z]/.test(value),/[a-z]/.test(value),/\d/.test(value),/[^\w\s]/.test(value)].filter(Boolean).length; }
export function filterListings(items,{query='',category='Todos',maxPrice=10000,condition='Todos'}={}) {
 const words=query.toLocaleLowerCase('pt-BR').trim().split(/\s+/).filter(Boolean);
 return items.filter(x=>words.every(w=>`${x.title} ${x.brand} ${x.model} ${x.category} ${JSON.stringify(x.specifications??{})}`.toLocaleLowerCase('pt-BR').includes(w))&&(category==='Todos'||x.category===category)&&Number(x.price)<=maxPrice&&(condition==='Todos'||x.condition===condition));
}
export const statusLabels={draft:'Rascunho',awaiting_technical:'Aguardando avaliação',in_review:'Em avaliação',approved:'Aprovado para reutilização',rejected:'Reprovado',recycling:'Encaminhado à reciclagem',pending_confirmation:'Aguardando confirmação',cancelled:'Cancelado',paid:'Pagamento confirmado',awaiting:'Aguardando encaminhamento',requested:'Encaminhamento solicitado',received:'Recebido pelo parceiro',confirmed:'Destinação confirmada'};
export function categoryImage(category='') { return category.includes('RAM')?'memory':category.includes('vídeo')?'gpu':category.includes('Processador')?'processor':category.includes('mãe')?'motherboard':category.includes('Notebook')?'notebook':'ssd'; }
