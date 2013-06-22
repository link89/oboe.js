

function controller(httpMethodName, url, data, doneCallback) {

   var 
       // the api available on an oboe instance. Will expose 3 methods, onPath, onFind and onError               
       instanceApi = {},
       events = pubSub(instanceApi),
       clarinetParser = clarinet.parser(),
       body = data? (isString(data)? data: JSON.stringify(data)) : null,
              
       // create a json builder and store a function that can be used to get the
       // root of the json later:
       /**
        * @type {Function}
        */          
       root =  jsonBuilder(
                   clarinetParser,
                    
                   // when a node is found, notify matching node listeners:
                   partialComplete(events.notify, NODE_FOUND_EVENT),

                   // when a node is found, notify matching path listeners:                                        
                   partialComplete(events.notify, PATH_FOUND_EVENT)
               );          
               
   clarinetParser.onerror =  
      function(e) {
         events.notifyErr(e);
            
         // the json is invalid, give up and close the parser to prevent getting any more:
         clarinetParser.close();
      };               
   
   /**
    * Add a new json path to the parser, to be called as soon as the path is found, but before we know
    * what value will be in there.
    *
    * @param {String} jsonPath
    *    The jsonPath is a variant of JSONPath patterns and supports these special meanings.
    *    See http://goessner.net/articles/JsonPath/
    *          !                - root json object
    *          .                - path separator
    *          foo              - path node 'foo'
    *          ['foo']          - paFth node 'foo'
    *          [1]              - path node '1' (only for numbers indexes, usually arrays)
    *          *                - wildcard - all objects/properties
    *          ..               - any number of intermediate nodes (non-greedy)
    *          [*]              - equivalent to .*
    *
    * @param {Function} callback({Object}foundNode, {String[]}path, {Object[]}ancestors)
    *
    * @param {Object} [context] the context ('this') for the callback
    */
   instanceApi.onPath = partialComplete(events.on, PATH_FOUND_EVENT);

   /**
    * Add a new json path to the parser, which will be called when a value is found at the given path
    *
    * @param {String} jsonPath supports the same syntax as .onPath.
    *
    * @param {Function} callback({Object}foundNode, {String[]}path, {Object[]}ancestors)
    * @param {Object} [context] the context ('this') for the callback
    * 
    * TODO: rename to onNode
    */
   instanceApi.onFind = partialComplete(events.on, NODE_FOUND_EVENT);
   
   instanceApi.onError = events.onError;
                                                                                              
   streamingXhr(
      httpMethodName,
      url, 
      body,
      function (nextDrip) {
         // callback for when a bit more data arrives from the streaming XHR         
          
         try {
            clarinetParser.write(nextDrip);
         } catch(e) {
            // we don't have to do anything here because we always assign a .onerror
            // to clarinet which will have already been called by the time this 
            // exception is thrown.                
         }
      },
      function() {
         // callback for when the response is complete                     
         clarinetParser.close();
         
         doneCallback && doneCallback(root());
      });
      
   return instanceApi;                                         
}