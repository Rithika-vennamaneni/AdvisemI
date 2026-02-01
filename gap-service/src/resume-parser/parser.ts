import pdfParse from 'pdf-parse';

export const parsePdfBuffer = async (buffer: Buffer): Promise<string> => {
  const data = await pdfParse(buffer);
  return data.text ?? '';
};
