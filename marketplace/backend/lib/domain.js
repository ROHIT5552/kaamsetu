export const categories = ['plumbing','electrical','carpentry','painting','masonry','general'];
export const areas = ['CIDCO','Waluj MIDC','Chikalthana','Shendra','Aurangpura','Kranti Chowk','Beed Bypass'];
export const requiredCredential = {electrical:'electrical-license'};
export const transitions = {
  confirmed: {en_route:'worker', cancelled:'either'},
  en_route: {arrived:'worker', cancelled:'either'},
  arrived: {in_progress:'employer', disputed:'either'},
  in_progress: {completed:'employer', disputed:'either'}
};
export const distance = (a,b) => {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 +
    Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.min(1,h)));
};