import { authenticate } from '../services/auth.service.js';

export async function login(req, res) {
  res.json(await authenticate(req.validatedBody.email, req.validatedBody.password));
}
