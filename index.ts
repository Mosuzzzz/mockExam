import { Elysia } from "elysia";
import api from "./apps/api/src/app";

const app = new Elysia().use(api);

export default app;
