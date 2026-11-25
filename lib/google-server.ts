import { google } from 'googleapis';
import { runtimeConfig } from './runtime-config';

const tabs: Record<string, string> = { customers: 'Khách hàng', products: 'Sản phẩm', media: 'Thư viện ảnh', orders: 'Đơn đặt may', inventory: 'Kho hàng', employees: 'Nhân viên', attendance: 'Chấm công', finance: 'Thu chi', users: 'Phân quyền', ai_analysis: 'Phân tích AI' };

function getAuth() {
  if (!runtimeConfig.googleServiceAccountJson) return null;
  const credentials = JSON.parse(runtimeConfig.googleServiceAccountJson);
  return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'] });
}

export async function syncTablesToGoogleSheets(tables: Record<string, Array<Record<string, unknown>>>, expected: Record<string,Record<string,unknown>>) {
  const auth = getAuth();
  if (!auth || !runtimeConfig.googleSheetId) throw new Error('Chưa cấu hình Google Sheets API.');
  const sheets = google.sheets({ version: 'v4', auth });
  const counts: Record<string,number> = {};
  for (const [table,rows] of Object.entries(tables)) {
    if (!rows.length || !tabs[table]) continue;
    const range = "'" + tabs[table] + "'!";
    const meta=await sheets.spreadsheets.get({spreadsheetId:runtimeConfig.googleSheetId,fields:'sheets.properties.title'});
    const exists=meta.data.sheets?.some(s=>s.properties?.title===tabs[table]);
    if (!exists) await sheets.spreadsheets.batchUpdate({spreadsheetId:runtimeConfig.googleSheetId,requestBody:{requests:[{addSheet:{properties:{title:tabs[table],gridProperties:{frozenRowCount:1}}}}]}});
    const params={spreadsheetId:runtimeConfig.googleSheetId};
    const grid=(await sheets.spreadsheets.values.get({...params,range:range+'A:AZ',valueRenderOption:'FORMULA'})).data.values || [];
    const keys=Object.keys(rows[0]).filter(k=>k!=='password_hash');
    const headers=grid[0] || keys;
    const idCol=headers.indexOf('id');
    if(idCol<0 || new Set(headers).size!==headers.length) throw Error('Thiếu mã dòng hoặc trùng tiêu đề trên '+tabs[table]);
    if(!grid.length) await sheets.spreadsheets.values.update({...params,range:range+'A1',valueInputOption:'RAW',requestBody:{values:[headers]}});
    const ids=grid.slice(1).map(r=>String(r[idCol]??''));
    if(new Set(ids.filter(Boolean)).size!==ids.filter(Boolean).length) throw Error('Mã dòng bị trùng trên '+tabs[table]);
    for(const row of rows){
      const index=ids.indexOf(String(row.id));
      if(index<0){
        await sheets.spreadsheets.values.append({...params,range:range+'A:AZ',insertDataOption:'INSERT_ROWS',valueInputOption:'RAW',requestBody:{values:[headers.map(k=>row[k]??'')]}});
        continue;
      }
      const changes=headers.flatMap((k,c)=>{
        if(!Object.hasOwn(expected[String(row.id)]||{},k)||!keys.includes(k)||String(row[k]??'')===String(grid[index+1][c]??'')) return [];
        if(String(grid[index+1][c]??'')!==String(expected[String(row.id)][k]??'')) throw Error('Sheet đã được sửa. Cần đối chiếu dòng '+row.id);
        const col=c<26?String.fromCharCode(65+c):'A'+String.fromCharCode(65+c-26);
        if(String(grid[index+1][c]??'').startsWith('=')) throw Error('Ô có công thức, cần đối chiếu trước.');
        return [{range:range+col+(index+2),values:[[row[k]??'']]}];
      });
      if(changes.length) await sheets.spreadsheets.values.batchUpdate({...params,requestBody:{valueInputOption:'RAW',data:changes}});
    }
    counts[table]=rows.length;
  }
  return counts;
}
