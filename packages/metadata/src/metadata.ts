import {
  defineMetadata,
  getMetadata,
  getOwnMetadata,
  hasMetadata,
  hasOwnMetadata,
} from "./impl/reflect.js";

type PropertyKey = string | symbol;

export interface MetadataKey<T> {
  readonly id: string | symbol;
}

export function newMetadataKey<T>(id: string | symbol): MetadataKey<T> {
  return { id };
}

export abstract class Metadata {
  abstract hasOwn(metadataKey: MetadataKey<any>): boolean;

  abstract getOwn<T>(metadataKey: MetadataKey<T>): T | undefined;

  abstract has(metadataKey: MetadataKey<any>): boolean;

  abstract get<T>(metadataKey: MetadataKey<T>): T | undefined;

  abstract set<T>(metadataKey: MetadataKey<T>, metadataValue: T): void;

  updateOwn<T>(
    metadataKey: MetadataKey<T>,
    cb: (value?: T | undefined) => T,
  ): void {
    this.set(metadataKey, cb(this.getOwn(metadataKey)));
  }

  update<T>(
    metadataKey: MetadataKey<T>,
    cb: (value?: T | undefined) => T,
  ): void {
    this.set(metadataKey, cb(this.get(metadataKey)));
  }
}

export const objectMetadata = (target: object): Metadata => {
  return new (class extends Metadata {
    hasOwn({ id }: MetadataKey<any>): boolean {
      return hasOwnMetadata(id, target);
    }

    getOwn<T>({ id }: MetadataKey<T>): T | undefined {
      return getOwnMetadata(id, target);
    }

    has({ id }: MetadataKey<any>): boolean {
      return hasMetadata(id, target);
    }

    get<T>({ id }: MetadataKey<T>): T | undefined {
      return getMetadata(id, target);
    }

    set<T>({ id }: MetadataKey<T>, metadataValue: T): void {
      defineMetadata(id, metadataValue, target);
    }
  })();
};

export const propertyMetadata = (
  target: object,
  propertyKey: PropertyKey,
): Metadata => {
  return new (class extends Metadata {
    hasOwn({ id }: MetadataKey<any>): boolean {
      return hasOwnMetadata(id, target, propertyKey);
    }

    getOwn<T>({ id }: MetadataKey<T>): T | undefined {
      return getOwnMetadata(id, target, propertyKey);
    }

    has({ id }: MetadataKey<any>): boolean {
      return hasMetadata(id, target, propertyKey);
    }

    get<T>({ id }: MetadataKey<T>): T | undefined {
      return getMetadata(id, target, propertyKey);
    }

    set<T>({ id }: MetadataKey<T>, metadataValue: T): void {
      defineMetadata(id, metadataValue, target, propertyKey);
    }
  })();
};