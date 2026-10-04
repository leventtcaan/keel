/**
 * A CSV file as rows of fields (RFC 4180, K-609): a field in double quotes may hold commas, line breaks and doubled
 * quotes; CRLF or LF ends a row; a byte-order mark at the start is not text; an empty line is no row. A quote left open
 * is not a file we can read — it throws rather than guess where the field ends.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const endRow = () => {
    row.push(field);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
    field = '';
  };
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') endRow();
    else if (c === '\r' && text[i + 1] === '\n') {
      endRow();
      i++;
    } else field += c;
  }
  if (quoted) throw new Error('A quoted field is not closed');
  if (field !== '' || row.length > 0) endRow();
  return rows;
}
