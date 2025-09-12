import { inject, Injectable, signal, WritableSignal, computed } from '@angular/core';
import { firestore } from '../firebase-config';
import { collection, CollectionReference, DocumentData, DocumentSnapshot, getDocs, limit, onSnapshot, orderBy, OrderByDirection, query, QuerySnapshot, startAfter, Unsubscribe, where } from 'firebase/firestore';

import { StatesGlobal } from '../../states/states.global';

// Tipos para mejorar la seguridad de tipos
export type CollectionName = string; 
export interface PaginatedResult<T extends DocumentData> { data: (T & { id: string })[]; lastDocument: DocumentSnapshot<T> | null; hasMore: boolean; }
export interface Paginacion {  orderByField: string;  orderDirection: OrderByDirection;  itemsByPage: number;}
export interface Filtros {  field: string;  value: any;  operator: '==' | '>' | '<' | '>=' | '<=' | 'array-contains';}



@Injectable({
  providedIn: 'root'
})
export class ReadService <T extends DocumentData> {

  private statesGlobal = inject(StatesGlobal);

  private _items: WritableSignal<(T & { id: string })[]> = signal([]);
  public items = computed(() => this._items());

  public lastDoc: WritableSignal<DocumentSnapshot<T> | null> = signal(null);
  public hasMore: WritableSignal<boolean> = signal(false);

  public paginating = this.statesGlobal.paginating;
  public states = this.statesGlobal.states;

  private unsubscribe: Unsubscribe | null = null;

  constructor() { }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  public obtenerDocumentos(
    collectionName: string,
    paginacion: Paginacion,
    filtros?: Filtros[]
  ): void {
    try {
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      this.statesGlobal.setLoading();
      this._items.set([]);
      this.lastDoc.set(null);
      this.hasMore.set(false);

      const colRef = collection(firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) {
        for (const filter of filtros) {
          q = query(q, where(filter.field, filter.operator, filter.value));
        }
      }

      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), limit(paginacion.itemsByPage));

      this.unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<T>) => {
        const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
        this._items.set(data);
        this.lastDoc.set(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] as DocumentSnapshot<T> : null);
        this.hasMore.set(snapshot.docs.length === paginacion.itemsByPage);

        if (data.length === 0) {
          this.statesGlobal.setEmpty();
        } else {
          this.statesGlobal.setSuccess();
        }
      }, (error: any) => {
        this.statesGlobal.setError(error.message);
        this.hasMore.set(false);
        this.unsubscribe = null;
      });

    } catch (error: any) {
      this.statesGlobal.setError(error.message);
      this.hasMore.set(false);
    }
  }

  public async cargarMasDocumentos(
    collectionName: string,
    paginacion: Paginacion,
    filtros?: Filtros[]
  ): Promise<void> {
    const startAfterDoc = this.lastDoc();
    if (!startAfterDoc) return;

    try {
      this.statesGlobal.startPaginating();

      const colRef = collection(firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) {
        for (const filter of filtros) {
          q = query(q, where(filter.field, filter.operator, filter.value));
        }
      }

      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), startAfter(startAfterDoc), limit(paginacion.itemsByPage));

      const snapshot: QuerySnapshot<T> = await getDocs(q);
      const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));

      this._items.update(currentItems => [...currentItems, ...data]);
      this.lastDoc.set(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] as DocumentSnapshot<T> : null);
      this.hasMore.set(snapshot.docs.length === paginacion.itemsByPage);

      this.statesGlobal.stopPaginating();
    } catch (error: any) {
      this.statesGlobal.setError(error.message);
      this.statesGlobal.stopPaginating();
      this.hasMore.set(false);
    }
  }
  
}
