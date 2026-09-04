import * as profileService from '../services/profile.service.js';

export async function getProfile(req, res) {
  res.json(await profileService.getProfile(req.user.sub));
}

export async function updateProfile(req, res) {
  res.json(await profileService.updateProfile(req.user.sub, req.validatedBody));
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.validatedBody;
  await profileService.changePassword(req.user.sub, currentPassword, newPassword);
  res.json({ message: 'Password updated successfully.' });
}
