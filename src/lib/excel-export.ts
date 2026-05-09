import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

export function exportToExcel(data: any[], fileName: string, sheetName: string) {
    // Generate filename
    const fullFileName = `${fileName}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-fit columns
    const colWidths = Object.keys(data[0] || {}).map(key => {
        const maxLength = Math.max(
            key.toString().length,
            ...data.map(item => (item[key] ? item[key].toString().length : 0))
        );
        return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = colWidths;

    // Generate Excel Buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create Blob and Download
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, fullFileName);
}
