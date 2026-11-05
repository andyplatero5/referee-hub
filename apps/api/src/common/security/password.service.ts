import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  // Hash de relleno para que un correo inexistente tarde lo mismo que uno real
  // (evita revelar qué correos están registrados midiendo el tiempo de respuesta).
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash('referee-hub-dummy-password');
    await this.verify(await this.dummyHash, password);
  }
}
