import { inject, Injectable, signal, WritableSignal, computed } from '@angular/core';
import { firestore } from '../firebase-config';
import { collection, CollectionReference, doc, DocumentData, DocumentReference, DocumentSnapshot, getDoc, getDocs, limit, onSnapshot, orderBy, OrderByDirection, query, QuerySnapshot, startAfter, where } from 'firebase/firestore';
import { StatesGlobal } from '../../states/states.global';
import { ProductInterface } from '../../interfaces/products/product-interface';

export type CollectionName = string;

export interface PaginatedResult<T extends DocumentData> {
  data: (T & { id: string })[];
  lastDocument: DocumentSnapshot<T> | null;
  hasMore: boolean;
}

export interface Paginacion {
  orderByField: string;
  orderDirection: OrderByDirection;
  itemsByPage: number;
}

export interface Filtros {
  field: string;
  value: any;
  operator: '==' | '>' | '<' | '>=' | '<=' | 'array-contains';
}

@Injectable({
  providedIn: 'root'
})
export class ReadService<T extends DocumentData> {

  private statesGlobal = inject(StatesGlobal);

  private _items: WritableSignal<(T & {id: string})[]> = signal([]);

  items = computed(() => this._items());

  lastDoc: WritableSignal<DocumentSnapshot<T> | null> = signal(null);

  paginating = this.statesGlobal.paginating;
  states = this.statesGlobal.states;

  constructor() { }

  obtenerColeccionEnTiempoReal(
    collectionName: CollectionName,
    paginacion?: Paginacion,
    filtros?: Filtros[]
  ): WritableSignal<(T & { id: string })[]> {
    const dataSignal: WritableSignal<(T & { id: string })[]> = signal([]);
    const colRef = collection(firestore, collectionName) as CollectionReference<T>;
    let q: any = query(colRef);

    if (filtros) {
      for (const filter of filtros) {
        q = query(q, where(filter.field, filter.operator, filter.value));
      }
    }

    if (paginacion) {
      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), limit(paginacion.itemsByPage));
    }

    onSnapshot(q, (snapshot: QuerySnapshot<T>) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
      dataSignal.set(docs);
    });

    return dataSignal;
  }

  async obtenerTodosLosDocumentos(
    collectionName: CollectionName,
    paginacion?: Paginacion,
    filtros?: Filtros[]
  ): Promise<(T & { id: string })[]> {
    try {
      const colRef = collection(firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) {
        for (const filter of filtros) {
          q = query(q, where(filter.field, filter.operator, filter.value));
        }
      }

      if (paginacion) {
        q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), limit(paginacion.itemsByPage));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
    } catch (error) {
      throw error;
    }
  }

  async obtenerDocumentoPorId(
    collectionName: CollectionName,
    id: string
  ): Promise<(T & { id: string }) | null> {
    try {
      const docRef = doc(firestore, collectionName, id) as DocumentReference<T>;
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      return { id: snapshot.id, ...snapshot.data() } as (T & { id: string });
    } catch (error) {
      throw error;
    }
  }

  async obtenerSubcoleccion(
    parentCollection: string,
    parentId: string,
    subcollection: string
  ): Promise<(T & { id: string })[]> {
    try {
      const colRef = collection(firestore, parentCollection, parentId, subcollection) as CollectionReference<T>;
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
    } catch (error) {
      throw error;
    }
  }

  async obtenerDocumentosPaginadosYFiltrados(
    collectionName: string,
    paginacion: Paginacion,
    filtros?: Filtros[],
    startAfterDoc?: DocumentSnapshot<T> | null
  ): Promise<PaginatedResult<T>> {
    try {
      const colRef = collection(firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) {
        for (const filter of filtros) {
          q = query(q, where(filter.field, filter.operator, filter.value));
        }
      }

      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection));

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      q = query(q, limit(paginacion.itemsByPage));

      const snapshot = await getDocs(q);
      const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
      const newLastDocument: DocumentSnapshot<T> | null = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] as DocumentSnapshot<T> : null;
      const hasMore = snapshot.docs.length === paginacion.itemsByPage;

      return { data, lastDocument: newLastDocument, hasMore };
    } catch (error) {
      throw error;
    }
  }
}
