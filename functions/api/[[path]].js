import { handleApi } from "../../server/handler.js";
export const onRequest = ({ request, env }) => handleApi(request, env);
