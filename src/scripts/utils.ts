import axios from 'axios';

const wait = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms));

const arrayFromIntRange = (start, end, { step = 1 } = {}) => {
  start = parseInt(start);
  end = parseInt(end);
  return [...Array(end - start + 1).keys()].map(i => (i * step) + start);
};

const customAxios = async (url, {
  method = 'get',
  headers,
  params,
  body,
  
  verbose,
  omitRequestId = false,

  ...axiosOptions
} = {}) => {
  
  // Generate a request ID if not provided
  if (!omitRequestId) {
    if (!headers) {
      headers = {};
    }

    if (!headers['x-request-id']) {
      headers['x-request-id'] = Date.now();
    }
  }
  
  const axiosConfig = {
    ...(headers && { headers }),
    ...(params && { params }),
    ...axiosOptions,
  };
  
  let response;
  let done = false;
  let cooldown = 3000;
  let retryAttempt = 0;
  let maxRetries = 5;
  
  while (!done) {
    try {

      if (method === 'get') {

        response = await axios[method](url, axiosConfig);

      } else if (method === 'delete') {
        
        // Axios delete with body needs data in config, not as second param
        response = await axios[method](url, { 
          ...axiosConfig, 
          ...body ? { data: body } : {}, 
        });

      } else {

        response = await axios[method](url, body, axiosConfig);

      }
      
      return {
        success: true,
        result: response.data,
      };
      
    } catch(error) {
      
      const { response: errResponse } = error;

      // Get code from error object itself (for connection errors)
      // or from response (for HTTP errors)
      const code = errResponse?.code || error?.code;
      const status = errResponse?.status;
      const statusText = errResponse?.statusText;
      const config = errResponse?.config || error?.config;
      const headers = errResponse?.headers || {};
      const data = errResponse?.data;
      const message = data?.message || error?.message;
      
      verbose && console.error(status, code);

      let errResponseTruncated = errResponse;
      if ((code || status || statusText || config || data)) {
        errResponseTruncated = {
          code,
          status,
          statusText,
          config,
          data,
        };
      }
      
      // TODO: Consider hooking back up to verbose / local/hosted
      console.warn(errResponseTruncated);
      
      const retryStatuses = [408, 429, ...arrayFromIntRange(500, 599)];
      const retryCodes = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'];
      const shouldRetry = retryStatuses.includes(status) || retryCodes.includes(code);
      
      if (shouldRetry) {
        if (retryAttempt >= maxRetries) {
          console.log(`Ran out of retries`);
          return {
            success: false,
            error: [errResponseTruncated || error],
          };
        }
        
        retryAttempt++;
        // TODO: Consider moving logic into Bleckmann interpreter, the only API to use this format so far
        const waitSecondsFromMessage = parseInt(message?.match(/(\d+) seconds/)?.[1]);
        const waitTime = headers?.['retry-after'] 
          ? seconds(headers['retry-after'])
          : waitSecondsFromMessage
            ? seconds(waitSecondsFromMessage + 2) // add a small buffer
            : cooldown;
        verbose && console.log(`Retry attempt #${ retryAttempt }, waiting ${ waitTime }`);
        await wait(waitTime);
        cooldown += cooldown;
        continue;
      }
      
      return {
        success: false,
        error: [errResponseTruncated || error],
      };
      
    }
  }
};

const t = (path: string) =>
  path.split('.').reduce((obj, key) => obj?.[key], window.shopivibe?.translations) ?? path;

export { 
  wait,
  customAxios,
  t,
};