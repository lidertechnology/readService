# readService
Servicio para lecturas en proyectos lidertech.


Exploremos cada uno de los métodos de tu biblioteca de lectura, ReadService, con una explicación simple y ejemplos de su uso en un componente.

# 1. obtenerColeccionEnTiempoReal
Este método es para cuando necesitas que tu aplicación reaccione inmediatamente a los cambios en la base de datos. Piénsalo como una suscripción en vivo a una colección.

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

¿Qué hace?: Crea una conexión persistente con Firestore. Cada vez que se agrega, modifica o elimina un documento en la colección, el signal del componente que usa este método se actualiza de forma automática.

Ideal para:

Chats en tiempo real 💬: Muestra los mensajes nuevos a medida que se envían.

Notificaciones: Muestra alertas nuevas sin necesidad de recargar la página.

Dashboards de control: Refleja datos cambiantes, como el stock de un producto o el estado de un pedido.

Ejemplo de uso en un componente:

TypeScript

// Se usa un signal para mantener la reactividad en tiempo real

          public productos = this.readService.obtenerColeccionEnTiempoReal('Productos');

          
# 2. obtenerTodosLosDocumentos
Este método es la forma más rápida de obtener todos los documentos de una colección de una sola vez. Es una lectura única y completa.

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

¿Qué hace?: Realiza una sola solicitud a la base de datos para recuperar todos los documentos que cumplen con los filtros y la paginación que especifiques. Es la opción perfecta si sabes que la colección es pequeña.

Ideal para:

Listas cortas: Menús de categorías o configuraciones de la aplicación.

Datos que no cambian a menudo: Un listado de países o tipos de usuario.

Ejemplo de uso en un componente:

TypeScript

    async ngOnInit() {
      // Cargar todos los usuarios sin filtros
      this.usuarios.set(await this.readService.obtenerTodosLosDocumentos('Usuarios'));
    }


# 3. obtenerDocumentoPorId
Este método es la forma más eficiente de obtener un solo documento cuando conoces su identificador único.

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

¿Qué hace?: Busca un documento específico por su id. Es una operación de lectura única, muy económica y rápida.

Ideal para:

Páginas de detalles: Muestra la información de un producto o de un usuario después de haber hecho clic en un elemento.

Perfiles de usuario: Carga el perfil de un usuario logueado.

Ejemplo de uso en un componente:

TypeScript

    async cargarDetallesProducto(id: string) {
      this.productoSeleccionado.set(await this.readService.obtenerDocumentoPorId('Productos', id));
    }



# 4. obtenerSubcoleccion
Este método te permite acceder a una colección que está anidada dentro de otro documento. Esencialmente, te permite navegar por la estructura de tu base de datos de manera jerárquica.

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

¿Qué hace?: Lee todos los documentos de una subcolección específica, sin necesidad de cargar el documento padre. Esto es clave para mantener tus costos bajos, ya que evitas lecturas innecesarias.

Ideal para:

Comentarios de un blog: Cada publicación tiene su propia subcolección de comentarios.

Imágenes de una galería: Cada galería principal tiene una subcolección de imágenes.

Ejemplo de uso en un componente:

TypeScript

    async cargarImagenesGaleria(galeriaId: string) {
      this.imagenes.set(await this.readService.obtenerSubcoleccion('Galerias', galeriaId, 'Imagenes'));
    }


# 5. obtenerDocumentosPaginadosYFiltrados
Este es el método más potente y flexible para manejar grandes colecciones de datos. Es tu solución universal para la paginación y el filtrado.

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

¿Qué hace?: Te permite cargar documentos en "bloques" (itemsByPage), lo que reduce la cantidad de lecturas y mejora el rendimiento. También puedes aplicar uno o varios filtros para buscar datos específicos y, si lo necesitas, puedes continuar la paginación a partir de un punto en particular (startAfterDoc).

Ideal para:

Galerías de productos: Cargar 10 productos a la vez.

Listas de usuarios: Mostrar una lista con filtros por rol o fecha de registro.

Ejemplo de uso en un componente:

TypeScript

    // Configuración para cargar los primeros 10 productos de una categoría específica, ordenados por fecha
    const paginacion = { orderByField: 'creationDate', orderDirection: 'asc', itemsByPage: 10 };
    const filtros = [{ field: 'category', value: 'ElectricFireplaces', operator: '==' }];
    
    async ngOnInit() {
      const resultado = await this.readService.obtenerDocumentosPaginadosYFiltrados('Productos', paginacion, filtros);
      this.productos.set(resultado.data);
      this.lastDoc.set(resultado.lastDocument);
      //... manejar el estado del componente
    }
