
# Informe Técnico: ReadService (Actualizado)
El ReadService es el servicio de lectura definitivo para todos tus proyectos Lidertech, diseñado para interactuar con Cloud Firestore de manera genérica, eficiente y escalable. Su arquitectura centralizada elimina la lógica compleja de los componentes, permitiendo un desarrollo más rápido y consistente.

# Capacidades Clave del Servicio
El servicio se basa en dos métodos principales, que juntos cubren todas las necesidades de lectura de una aplicación moderna:

obtenerDocumentos(collectionName, paginacion, filtros?)
Este es el método de consulta principal. Utiliza onSnapshot para proporcionar actualizaciones en tiempo real. 

Se usa para:

* Lectura en Tiempo Real: Establece un listener que se actualiza automáticamente cada vez que los datos cambian en Firestore.

* Carga Inicial: Obtiene la primera página de documentos.

* Ordenamiento: Permite ordenar la colección de forma ascendente o descendente.

* Filtrado Avanzado: Acepta un array de objetos Filtros para realizar búsquedas en uno o varios campos. Es el único método que se debe usar para iniciar o reiniciar una consulta.

* cargarMasDocumentos(collectionName, paginacion, filtros?)
Este método está diseñado para la paginación progresiva sin activar un listener. Su función es:

Carga Controlada por el Usuario: Carga la siguiente tanda de documentos utilizando el cursor de la consulta anterior (lastDoc). Esto evita lecturas innecesarias y optimiza el costo en Firestore.

Mantenimiento de Filtros y Orden: La consulta de la siguiente página mantiene los filtros y el orden aplicados en la consulta inicial.

# Cómo Usar el ReadService en tus Componentes
La simplicidad del ReadService se refleja en los componentes que lo consumen. 
La estrategia es siempre la misma: inyectar el servicio y consumir sus señales públicas.

# 1. Configuración del Componente
En cada componente, define las propiedades de configuración como el nombre de la colección y la paginación.
Luego, inyecta el servicio y consume sus señales.

TypeScript

        import { Component, inject, OnInit } from '@angular/core';
        import { ReadService, Paginacion, Filtros } from '../../lidertechLibCentralModule/read.service';
        import { StatesGlobal } from '../../states/states.global';
        import { StatesEnum } from '../../states/states.enum';
        import { Product } from '../product.interface';
        
        @Component({ ... })
        export class TuComponente implements OnInit {
          private readService = inject(ReadService<Product>);
          private statesGlobal = inject(StatesGlobal);
        
          // ✅ Propiedades de configuración
          private coleccion = 'productos';
          private paginacion: Paginacion = {
            orderByField: 'creationDate',
            orderDirection: 'desc',
            itemsByPage: 10
          };
        
          // ✅ Consumo directo de las señales del servicio
          public productos = this.readService.items;
          public estados = this.readService.states;
          public paginando = this.readService.paginating;
          public hayMas = this.readService.hasMore;
          public StatesEnum = StatesEnum;
        
          ngOnInit(): void {
            // Se inicia el listener aquí, en ngOnInit
            this.readService.obtenerDocumentos(this.coleccion, this.paginacion);
          }
        }
        Ejemplos de Uso Práctico
        A. Paginación y Carga Progresiva
        Este es el escenario más común. El componente solo necesita un botón que llame al método cargarMasDocumentos.
        
        TypeScript
        
        // En tu componente .ts
        public cargarMas(): void {
          this.readService.cargarMasDocumentos(this.coleccion, this.paginacion);
        }
        
        // En tu template .html
        @if (hayMas()) {
          <button (click)="cargarMas()" [disabled]="paginando()">
            Cargar más productos
          </button>
        }

# B. Ordenamiento de Resultados y Lectura en Tiempo Real
Para ordenar los productos, simplemente crea una función que llame a obtenerDocumentos con una nueva dirección de orden. 
El listener se desuscribirá del anterior y se creará uno nuevo con la configuración actualizada, lo que mantendrá las actualizaciones en tiempo real.

TypeScript

        // En tu componente .ts
        public ordenarPor(direction: 'asc' | 'desc'): void {
          this.readService.obtenerDocumentos(
            this.coleccion,
            { ...this.paginacion, orderDirection: direction }
          );
        }
        
        // En tu template .html
        <button (click)="ordenarPor('asc')">Ordenar Asc</button>
        <button (click)="ordenarPor('desc')">Ordenar Desc</button>

# C. Buscadores y Filtros Múltiples
Para implementar una funcionalidad de búsqueda, solo necesitas pasar el parámetro filtros al método obtenerDocumentos. 
Tu servicio se encargará de crear la consulta adecuada y de reiniciar el listener con los nuevos filtros.

TypeScript

        // En tu componente .ts
        public buscar(termino: string): void {
          const filtros = [
            { field: 'nombre', operator: '==', value: termino }
          ];
          this.readService.obtenerDocumentos(
            this.coleccion,
            this.paginacion,
            filtros
          );
        }
        
        // Para múltiples filtros
        public buscarPorCategoriaYColor(categoria: string, color: string): void {
          const filtros = [
            { field: 'categoria', operator: '==', value: categoria },
            { field: 'color', operator: '==', value: color }
          ];
          this.readService.obtenerDocumentos(
            this.coleccion,
            this.paginacion,
            filtros
          );
        }


# Conclusión
El ReadService es una solución completa y robusta para la gestión de lecturas en tus aplicaciones. Centraliza toda la lógica de datos, reduce la complejidad de los componentes y garantiza la consistencia en el desarrollo. Al usar este servicio, puedes construir componentes simples y eficientes, enfocados en la interfaz de usuario, sabiendo que la gestión de datos se maneja de manera óptima y moderna.



# EJEMPLO completo>

Este componente utiliza tu servicio ReadService y ahora aplica tu convención de CSS para el contenedor principal.

TypeScript

        import { Component, OnInit, signal, Signal, inject } from '@angular/core';
        import { CommonModule } from '@angular/common';
        import { MatButtonModule } from '@angular/material/button';
        import { StatesEnum } from '../states.enum';
        import { ReusableGridComponent } from '../../lidertechLibCentralModule/reusable-grid/reusable-grid.component';
        import { ReadService, Paginacion, Filtros } from '../../lidertechLibCentralModule/read.service';
        import { StatesGlobal } from '../../states/states.global';
        import { Product } from '../product.interface';
        
        @Component({
          selector: 'app-products',
          standalone: true,
          imports: [
            CommonModule,
            ReusableGridComponent,
            MatButtonModule
          ],
          template: `
            <div class="box-4">
              @if (states() === StatesEnum.LOADED) {
                <app-reusable-grid
                  [conector]="products()"
                  [handsetCols]="signal(2)"
                  [tabletCols]="signal(3)"
                  [webCols]="signal(6)"
                  [gutterSize]="signal('16px')"
                  [rowHeight]="signal('1:1')"
                >
                  @for (product of products(); track product.id) {
                    <mat-card>
                      <img mat-card-image [src]="product.imageLink" [alt]="product.title">
                      <mat-card-header>
                        <mat-card-title>{{ product.title }}</mat-card-title>
                        <mat-card-subtitle>{{ product.price | currency }}</mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <p>{{ product.description }}</p>
                      </mat-card-content>
                    </mat-card>
                  }
                </app-reusable-grid>
              } @else if (states() === StatesEnum.LOADING) {
                <span>Cargando productos...</span>
              } @else if (states() === StatesEnum.ERROR) {
                <span>Error al cargar los productos.</span>
              } @else if (states() === StatesEnum.EMPTY) {
                <span>No se encontraron productos.</span>
              }
            </div>
          `,
        })
        export class ProductsComponent implements OnInit {
        
          private readonly readService = inject(ReadService<Product>);
          private readonly statesGlobal = inject(StatesGlobal);
        
          readonly states: Signal<StatesEnum> = this.statesGlobal.states;
          readonly products: Signal<Product[]> = this.readService.items;
          readonly hasMore: Signal<boolean> = this.readService.hasMore;
        
          private readonly paginacion: Paginacion = {
            orderByField: 'creationDate',
            orderDirection: 'desc',
            itemsByPage: 10
          };
        
          private readonly filtros: Filtros[] = [
            { field: 'availability', operator: '==', value: 'in stock' }
          ];
        
          ngOnInit(): void {
            this.readService.obtenerDocumentos('products', this.paginacion, this.filtros);
          }
        
          public async cargarMas(): Promise<void> {
            await this.readService.cargarMasDocumentos('products', this.paginacion, this.filtros);
          }
        }






Ahora creame un informe mejorado del servicio y que incluya el ejemplo de uso del componente basado en este ultimo componente asi tendremos un informe full completo



Informe Técnico Mejorado: ReadService
El ReadService es el servicio de lectura definitivo para todos tus proyectos Lidertech, diseñado para interactuar con Cloud Firestore de manera genérica, eficiente y escalable. Su arquitectura centralizada elimina la lógica compleja de los componentes, permitiendo un desarrollo más rápido y consistente.

Este informe incluye una descripción completa del servicio y un ejemplo de uso en un componente, ajustado a tus convenciones de box.css.

Capacidades Clave del Servicio
El servicio se basa en dos métodos principales, que juntos cubren todas las necesidades de lectura de una aplicación moderna:

obtenerDocumentos(collectionName, paginacion, filtros?)
Este es el método de consulta principal. Utiliza onSnapshot para proporcionar actualizaciones en tiempo real. Se usa para:

Lectura en Tiempo Real: Establece un listener que se actualiza automáticamente cada vez que los datos cambian en Firestore.

Carga Inicial: Obtiene la primera página de documentos.

Ordenamiento: Permite ordenar la colección de forma ascendente o descendente.

Filtrado Avanzado: Acepta un array de objetos Filtros para realizar búsquedas en uno o varios campos. Es el único método que se debe usar para iniciar o reiniciar una consulta.

cargarMasDocumentos(collectionName, paginacion, filtros?)
Este método está diseñado para la paginación progresiva sin activar un listener. Su función es:

Carga Controlada por el Usuario: Carga la siguiente tanda de documentos utilizando el cursor de la consulta anterior (lastDoc). Esto evita lecturas innecesarias y optimiza el costo en Firestore.

Mantenimiento de Filtros y Orden: La consulta de la siguiente página mantiene los filtros y el orden aplicados en la consulta inicial.

Cómo Usar el ReadService en tus Componentes
La simplicidad del ReadService se refleja en los componentes que lo consumen. La estrategia es siempre la misma: inyectar el servicio y consumir sus señales públicas.

1. Configuración del Componente
En cada componente, define las propiedades de configuración como el nombre de la colección y la paginación. Luego, inyecta el servicio y consume sus señales.

TypeScript

        import { Component, inject, OnInit } from '@angular/core';
        import { ReadService, Paginacion, Filtros } from '../../lidertechLibCentralModule/read.service';
        import { StatesGlobal } from '../../states/states.global';
        import { StatesEnum } from '../../states/states.enum';
        import { Product } from '../product.interface';
        
        @Component({ ... })
        export class TuComponente implements OnInit {
          private readService = inject(ReadService<Product>);
          private statesGlobal = inject(StatesGlobal);
        
          // ✅ Propiedades de configuración
          private coleccion = 'productos';
          private paginacion: Paginacion = {
            orderByField: 'creationDate',
            orderDirection: 'desc',
            itemsByPage: 10
          };
        
          // ✅ Consumo directo de las señales del servicio
          public productos = this.readService.items;
          public estados = this.readService.states;
          public paginando = this.readService.paginating;
          public hayMas = this.readService.hasMore;
          public StatesEnum = StatesEnum;
        
          ngOnInit(): void {
            // Se inicia el listener aquí, en ngOnInit
            this.readService.obtenerDocumentos(this.coleccion, this.paginacion);
          }
        }

Ejemplo de Uso Completo del Componente
Aquí tienes el código completo de un componente que implementa el servicio, incluyendo la plantilla (template), usando tu convención de box.css y mostrando un MatCard dentro de tu componente de cuadrícula reutilizable.

TypeScript

        import { Component, OnInit, signal, Signal, inject } from '@angular/core';
        import { CommonModule } from '@angular/common';
        import { MatButtonModule } from '@angular/material/button';
        import { MatCardModule } from '@angular/material/card';
        import { StatesEnum } from '../states.enum';
        import { ReusableGridComponent } from '../../lidertechLibCentralModule/reusable-grid/reusable-grid.component';
        import { ReadService, Paginacion, Filtros } from '../../lidertechLibCentralModule/read.service';
        import { StatesGlobal } from '../../states/states.global';
        import { Product } from '../product.interface';
        
        @Component({
          selector: 'app-products',
          standalone: true,
          imports: [
            CommonModule,
            ReusableGridComponent,
            MatButtonModule,
            MatCardModule
          ],
          template: `
            <div class="box-4">
              @if (states() === StatesEnum.LOADED) {
                <app-reusable-grid
                  [conector]="products()"
                  [handsetCols]="signal(2)"
                  [tabletCols]="signal(3)"
                  [webCols]="signal(6)"
                  [gutterSize]="signal('16px')"
                  [rowHeight]="signal('1:1')"
                >
                  @for (product of products(); track product.id) {
                    <mat-card>
                      <img mat-card-image [src]="product.imageLink" [alt]="product.title">
                      <mat-card-header>
                        <mat-card-title>{{ product.title }}</mat-card-title>
                        <mat-card-subtitle>{{ product.price | currency }}</mat-card-subtitle>
                      </mat-card-header>
                      <mat-card-content>
                        <p>{{ product.description }}</p>
                      </mat-card-content>
                    </mat-card>
                  }
                </app-reusable-grid>
              } @else if (states() === StatesEnum.LOADING) {
                <span>Cargando productos...</span>
              } @else if (states() === StatesEnum.ERROR) {
                <span>Error al cargar los productos.</span>
              } @else if (states() === StatesEnum.EMPTY) {
                <span>No se encontraron productos.</span>
              }
            </div>
          `,
        })
        export class ProductsComponent implements OnInit {
        
          private readonly readService = inject(ReadService<Product>);
          private readonly statesGlobal = inject(StatesGlobal);
        
          readonly states: Signal<StatesEnum> = this.statesGlobal.states;
          readonly products: Signal<Product[]> = this.readService.items;
          readonly hasMore: Signal<boolean> = this.readService.hasMore;
        
          private readonly paginacion: Paginacion = {
            orderByField: 'creationDate',
            orderDirection: 'desc',
            itemsByPage: 10
          };
        
          private readonly filtros: Filtros[] = [
            { field: 'availability', operator: '==', value: 'in stock' }
          ];
        
          ngOnInit(): void {
            this.readService.obtenerDocumentos('products', this.paginacion, this.filtros);
          }
        
          public async cargarMas(): Promise<void> {
            await this.readService.cargarMasDocumentos('products', this.paginacion, this.filtros);
          }
        }
