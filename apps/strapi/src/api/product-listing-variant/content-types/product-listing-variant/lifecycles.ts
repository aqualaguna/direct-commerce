
export default {
    // beforeCreate(event) {
    //   const { data, where, select, populate } = event.params;
  
    //   // let's do a 20% discount everytime
    //   event.params.data.price = event.params.data.price * 0.8;
    // },
  
    // afterCreate(event) {
    //   const { result, params } = event;
  
    //   // do something to the result;
    // },
    beforeDelete(event) {
        // console.log('beforeDelete', event);
    //   const { documentId } = event.params;

      // delete the variant
    //   await strapi.documents('api::product-listing-variant.product-listing-variant').delete({
    //     documentId,
    //   });
    },
  };