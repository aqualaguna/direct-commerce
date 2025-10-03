export const getPrice = (item: any) => {
  let result = 0;
  if (item.discountPrice) {
    result = parseFloat(item.discountPrice);
  } else {
    result = parseFloat(item.basePrice);
  }
  return isNaN(result) ? 0 : result;
};