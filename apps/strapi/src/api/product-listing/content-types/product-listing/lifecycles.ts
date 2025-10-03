
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
    async beforeDelete(event) {
      const { id } = event.params.where;

      // delete the variant if exists
      // const result = await strapi.db.query('api::product-listing-variant.product-listing-variant').deleteMany({
      //   where: {
      //     productListing: id,
      //   },
      // });
      try {
        await strapi.db.query('api::product-listing-variant.product-listing-variant').deleteMany({
          where: {
            productListing: Number(id) as any,
          },
        });
      } catch (error) {
        console.log("error", error);
      }

    },
  };