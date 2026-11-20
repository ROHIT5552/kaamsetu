export const maxPhotoBytes = 350 * 1024;
const maxEncodedBytes = Math.ceil(maxPhotoBytes / 3) * 4;
export const maxPhotoLength = maxEncodedBytes + 'data:image/webp;base64,'.length;

const pngHeader = Buffer.from('89504e470d0a1a0a','hex');
const pngEnd = Buffer.from('0000000049454e44ae426082','hex');

function hasImageSignature(type,bytes) {
  if (type === 'image/jpeg') {
    return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  }
  if (type === 'image/png') {
    return bytes.length >= 45 && bytes.subarray(0,8).equals(pngHeader) && bytes.subarray(-12).equals(pngEnd);
  }
  return bytes.length >= 20 && bytes.toString('ascii',0,4) === 'RIFF'
    && bytes.readUInt32LE(4) === bytes.length - 8 && bytes.toString('ascii',8,12) === 'WEBP'
    && ['VP8 ','VP8L','VP8X'].includes(bytes.toString('ascii',12,16));
}

export function listingPhoto(value) {
  if (!value || value.length > maxPhotoLength) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;

  const [,type,encoded] = match;
  const bytes = Buffer.from(encoded,'base64');
  if (bytes.length > maxPhotoBytes || bytes.toString('base64') !== encoded || !hasImageSignature(type,bytes)) return null;
  return {bytes,type};
}
