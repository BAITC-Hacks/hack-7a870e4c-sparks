import { axiosApi } from "./axios-client";

// biome-ignore lint/suspicious/noExplicitAny: axios config type
export const customInstance = <T>(config: any): Promise<T> => {
  return axiosApi(config).then(({ data }) => data);
};

export default customInstance;
