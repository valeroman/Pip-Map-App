export function translateAuthError(message?: string): string {
  const normalized = message?.toLowerCase() ?? '';

  if (normalized.includes('invalid login credentials')) return 'CREDENCIALES INVÁLIDAS';
  if (normalized.includes('email not confirmed')) return 'EMAIL NO CONFIRMADO';
  if (normalized.includes('user already registered')) return 'USUARIO YA REGISTRADO';
  if (normalized.includes('password should be at least')) return 'CONTRASEÑA DEMASIADO CORTA';
  if (normalized.includes('unable to validate email address') || normalized.includes('invalid email'))
    return 'EMAIL INVÁLIDO';
  if (normalized.includes('network')) return 'ERROR DE CONEXIÓN';

  return 'ACCESO DENEGADO';
}
