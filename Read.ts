import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { collection, CollectionReference, DocumentData, DocumentSnapshot, getDocs, limit, onSnapshot, orderBy, OrderByDirection, query, QuerySnapshot, startAfter, Unsubscribe, where } from 'firebase/firestore';
import { StateEnum } from '../states/state-enum';
import { Instancias } from './instancias';


// Tipos para mejorar la seguridad de tipos
export type CollectionName = string; 
export interface PaginatedResult<T extends DocumentData> { data: (T & { id: string })[]; lastDocument: DocumentSnapshot<T> | null; hasMore: boolean; }
export interface Paginacion {  orderByField: string;  orderDirection: OrderByDirection;  itemsByPage: number;}
export interface Filtros {  field: string;  value: any;  operator: '==' | '>' | '<' | '>=' | '<=' | 'array-contains';}



@Injectable({  providedIn: 'root'})

export class Read <T extends DocumentData> {

  private readonly firestore = inject(Instancias).firestore;

  // --- ARQUITECTURA QI 1000%: Única Fuente de Verdad para el Estado ---
  private readonly _stateEnumRead: WritableSignal<StateEnum> = signal(StateEnum.INICIAL);
  public readonly stateEnumRead = this._stateEnumRead.asReadonly();
  
  // --- Signals de Datos ---
  public readonly items: WritableSignal<(T & { id: string })[]> = signal([]);
  public readonly lastDoc: WritableSignal<DocumentSnapshot<T> | null> = signal(null);
  public readonly hasMore: WritableSignal<boolean> = signal(false);

  private unsubscribe: Unsubscribe | null = null;

  ngOnDestroy(): void {     if (this.unsubscribe) {       this.unsubscribe();     }   }

  public obtenerDocumentos( collectionName: string, paginacion: Paginacion, filtros?: Filtros[]   ): void {
    try { if (this.unsubscribe) { this.unsubscribe(); }

      this._stateEnumRead.set(StateEnum.CARGANDO);
      this.items.set([]);
      this.lastDoc.set(null);
      this.hasMore.set(false);

      const colRef = collection(this.firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) { for (const filter of filtros) { q = query(q, where(filter.field, filter.operator, filter.value)); }   }

      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), limit(paginacion.itemsByPage));

      this.unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<T>) => {
        const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));
        this.items.set(data);
        this.lastDoc.set(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] as DocumentSnapshot<T> : null);
        this.hasMore.set(snapshot.docs.length === paginacion.itemsByPage);

        if (data.length === 0) { this._stateEnumRead.set(StateEnum.SIN_RESULTADOS); } else { this._stateEnumRead.set(StateEnum.EXITO); }
      }, (error: any) => { this._stateEnumRead.set(StateEnum.ERROR); this.hasMore.set(false); this.unsubscribe = null;       });

    } 
    catch (error: any) { this._stateEnumRead.set(StateEnum.ERROR); this.hasMore.set(false); }
  }

  public async cargarMasDocumentos(    collectionName: string,    paginacion: Paginacion,    filtros?: Filtros[]   ): Promise<void> {
    const startAfterDoc = this.lastDoc();
    if (!startAfterDoc) return;

    try {
      this._stateEnumRead.set(StateEnum.PAGINANDO);

      const colRef = collection(this.firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      if (filtros) {       for (const filter of filtros) {         q = query(q, where(filter.field, filter.operator, filter.value));       }       }

      q = query(q, orderBy(paginacion.orderByField, paginacion.orderDirection), startAfter(startAfterDoc), limit(paginacion.itemsByPage));

      const snapshot: QuerySnapshot<T> = await getDocs(q);
      const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as T }));

      this.items.update(currentItems => [...currentItems, ...data]);
      this.lastDoc.set(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] as DocumentSnapshot<T> : null);
      this.hasMore.set(snapshot.docs.length === paginacion.itemsByPage);

      this._stateEnumRead.set(StateEnum.EXITO);
    } 
    catch (error: any) { 
      this._stateEnumRead.set(StateEnum.ERROR);
      this.hasMore.set(false); 
    }
  }

  // --- MÉTODO PARA LECTURAS DE "UN SOLO DISPARO" (USADO POR SEARCHCOMPONENT) ---

  public async obtenerDocumentosPorFiltro(
    collectionName: string,
    filtros: Filtros[],
    limite: number = 10 
  ): Promise<(T & { id: string })[]> {

    // Este método es "stateless":
    // 1. NO actualiza el estado interno del servicio (this._stateEnumRead).
    // 2. NO actualiza los signals (this.items).
    // 3. Devuelve los datos directamente (Promise<T[]>)

    try {
      const colRef = collection(this.firestore, collectionName) as CollectionReference<T>;
      let q: any = query(colRef);

      // Aplica los filtros (ej. >= y <= del buscador)
      for (const filter of filtros) {
        q = query(q, where(filter.field, filter.operator, filter.value));
      }

      // Aplica el límite de resultados
      q = query(q, limit(limite));

      // Ejecuta la consulta de "un solo disparo"
      const snapshot: QuerySnapshot<T> = await getDocs(q);
      
      const data: (T & { id: string })[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() as T 
      }));
      
      return data; // Retorna los datos directamente

    } catch (error) {
      // Relanza el error para que el SearchComponent 
      // lo capture en su propio try/catch y ponga el estado en ERROR.
      console.error('Error en obtenerDocumentosPorFiltro:', error);
      throw error;
    }
  }
}
