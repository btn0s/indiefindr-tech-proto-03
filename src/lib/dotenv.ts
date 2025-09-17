import dotenv from "dotenv";
const dEnv = () => dotenv.config({ path: [".env.local", ".env"] });
export default dEnv;
