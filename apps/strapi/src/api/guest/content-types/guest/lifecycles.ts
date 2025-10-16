
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
      // get session id
      const sessionId = event.params.data.sessionId;
      // delete cart
      console.log("sessionId", sessionId);

    },
  };