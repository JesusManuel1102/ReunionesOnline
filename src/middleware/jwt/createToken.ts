import jwt from "jsonwebtoken";

interface Payload {
  id: number;
  username: string;
}

const createToken = (payload: Payload, expiresIn: string) => {
  // jwt puede ser objeto con sign dentro de default (dependiendo de cómo se resuelva)
  return (jwt as any).sign(payload, process.env.JWT_SECRET || "secret", { expiresIn });
};

export default createToken;
