
/*
	PACKMAN 0.5
	By Nicolás Narváez

	Pensado inicialmente como un complemento a los cms´s, permitiendo que un sitio se carge
	dinamicamente al navegarlo haciendo pedidos de los contenidos que se van requiriendo. Estos
	están descritos como paquetes con dependencias	que son a su ves mas contenido que
	puede pedirse o generarse dinámicamente. Cada contenido indica como debe incrustarse en los
	otros a traves de su tipo o metainformación. El sistema de dependencias esta basado en pares de
	tipo y identificador que en condiciones normales representan la tabla y el id del elemento, pero
	se puede extender o modificar a partir de metainformación en los mismos contenidos que es
	mapeada de forma transparente en tipos taxonómicos. El contenido luego se instala resolviendo
	dependencias en la pagina actual según los scripts asociados a su tipo taxonómico.

	Packman guarda algo de metainformación cuando la va cargando para resolver los pedidos
	siguientes, y mantiene un mapa vivo de referencias entre los elementos html que indica su
	interdependencia y permite seguir "instalando" contenido.

	parte de los comentarios no son descriptivos, los escribí cuando aún estaba aclarando
	la idea hace algún tiempo, y solo reflejan lo que debo seguir cuando implemente alguna
	funcionalidad. No es necesario leerlos, los eliminare cuando los implemente y pondré
	jsdoc en su lugar a la implementación final. Quédense con el README

	/////////////////////////////////////////////////////////////Uso-funcionamiento (html built-in):
	La forma del arbol de dependencias es la forma del sitio, su estrucutra.
	La resolución de dependencias se usa al requerir un contenido (habilitarlo).
	La resolución de placeholders se usa al instalar un contenio (completarlo).

	Hay objetos o tipos de objetos que no tienen dependencia concluyente.
	Al guardarse contenido con placeholders, los objetos que contienen los placeholders serán
	añadidos a la lista de contenedores de los objetos referenciados. Ademas se pueden incluir
	etiquetas en los placeholders que añaden funcionamiento, como el forzar dependencia
	del contenedor.
	Si un objeto no tiene dependencias, se usara el primer contenedor encontrado.

	Así para definir un contenedor (o dependencia) de posts o de usuarios, se incluye el placeholder [[[Packman-post]]]
	o [[[Packman-user]]] y para un post específico, hacerlo su dependencia : [[[Packman-post-45,depends]]]

	[[[PRI:${PRI|type-ID}:modifiers]]]

	Hay paquetes sin id, estos son los 'ordenadores', permiten gestionar los paquetes de su tipo, que puede ser
	múltiple: post.pix_portfolio, post.portfolio, post.portfolio[priority<5] o page.zero_section, estos paquetes en su función add
	pueden agregar paquetes a su elemento sin tener placeholder en su html, ordenadamente (por ej. según fecha
	o prioridad) o de formas más complejas, al tener add´s definidas en su tipo.

	////////////////////////////////////////////////////////////////////Estructura:

	Typemap typemap
	//contiene los tipos que están implementados

	Depmap depmap
	//contiene la información de resolución de dependencias

	Packmap packmap
	//contiene los pack cargados

	Rpc rpc
	//objeto de configuración e interfaze rpc

	////////////////////////////////////////////////////////////////////Funciones:

	//add-ons -> interfaces extra añadidas al objeto packman, declaradas en packmanConfig

	//add-ons paquete htmlRestfullTree

	link([ url | identifier | list(identifier) ])
	//si es una url
	//	identifier[s] = identifier(url)
	//luego para cada identifier
	//install(identifier)
	//scroll(identifier)

	linkWrapper(event)
	//prevent default
	//existe data-packmanPack
	//	Packman.link( value(data-packmanPack) )
	//!existe:
	//	Packman.link(href)
	//

	////////////////////////////////////////////////////////////////////Objetos:

	PackmanConfig (definido desde el servidor o por javascript)
	//prepare()
	//	revisa que sus campos estén interpretados (se pueden agregar en otros formatos y este los interpretara para construirlos)
	//
	//Typemap typemap
	//	un typemap con los tipos definidos
	//
	//Depmap depmap
	//	un depmap con formas de resolución de dependencias definidas
	//
	//Packmap packmap
	//	un packmap con algunos paquetes
	//
	//list(function) functions
	//	lista cn funciones a añadir a packman
	//
	//Rpc rpc
	//	indica la configuración de las rps, y los links definidos
	//

	Built-in:
	//Son objetos de configuración primarios preexistentes:
	/////////////////htmlRestfullTree:
	//Pack root
	//	Es el paquete principal que esta en el inicio de Packman.
	//	state = 'installed';
	//
	//type meta:
	//data:
	//	containers:
	//		list(identifier): indica los objetos que lo contendran al ser instalado, y posteriormente los objetos que lo tienen incrustado
	//		de la forma:
	//				[mods:]identifier
	//			mods pueden modificar el comportamiento de los containers
	//				default: en que pack debe añadirse si no se especifico otro.
	//				current: pack a añadirlo ahora, luego de ejecutar add se elimina el modifier
	//
	//	htmlInstances
	//		list: referencias a los elementos html, si ya está instalado
	//
	//linkWrap(text[, class])
	//para cada instancia:
	//	revisa todos los enlaces con la clase htmlRestfullTree o la definida y les asocia el evento de encapsulación.
	//
	//	configure({ callback, context, reload[, .. ] })
	//
	//	install({containers, packs, ..}})
	//		containers: list(identificadores), packs : list(Packman.Pack)
	//	[containers] agrega los containers, fijandose en las etiquetes de los containers para determinar si instanciarse
	//		otra ves en ellos. en tal caso se envía a instalar con  container.install( {packs : [this]} )
	//
	//  [packs] revisa los placeholders en sus instancias, y sustituye cada placeholder por el pack que indica
	//
	//type root:
	//allMods: {block_all: true}

*/

var Packman = (function() {

	//internal meta-objects PRI´s
	var meta_type = '__meta_type__',
		root_pack_type = '__root_pack__';

	function Packman() {

		this.root_type = null;
		this.meta_type = null;

		//dep_map (mapa de dependencias):
		//es un hash que relaciona un identificador (ordenador, metapaquete, identificador
		//	único, identificador taxonómico con distintas profundidades, etc) con un objeto dep.
		this.dep_map = {};

		//Packmap (mapa de paquetes):
		//es un hash { 'identificador' : pack[, ..] }
		//que contiene los paquetes cargados en packman, identificador = type-id
		this.pack_map = {};

		this.type_map = {};
		this.taxon_map = {};
	}

	//add(Pack | Type | Taxon | Dep)
	//add object to packman
	//ademas completa y repara datos, es
	//por donde se deben agregar todos los packs preconfigurados para su verificación
	//se puede reimplementar o configurar con un packmanConfig
	function add(obj) {
		var PRI = obj.pri();
		if(obj instanceof Type) {

		}
		if(obj instanceof Taxon) {
			if( !this.taxon_map[ PRI ] )
				this.taxon_map[ PRI ] = obj;
		}
		if(obj instanceof Pack) {
			if( !this.pack_map[ PRI ] ) {
				this.pack_map[ PRI ] = obj;
			}
		}
		if(obj instanceof Dep) {

		}

	}

	//Returns an object
	//return {deps, packs}
	//deps: the subdependencies of the dependency
	//packs: the packs to which the dependency links
	function deps( descriptor ) {
		if(!descriptor.type_data)
			return;

		var mask_descriptor = {},	//get relevant, temporary interfaze
			caller_pack,	//if exists, get
			i,
			result,
			packs, deps,	//results
			block_all = false,	//will stop further taxonomy resolution
			arr = Packman.Arr;	//helper library for arrays

		//filter information to use when constructing PRI for searching dependencies
		mask_descriptor.id = descriptor.id;
		mask_descriptor.type_data = descriptor.type_data;

		//get the package for which we are iterating, if it exists
		caller_pack = this.pack_map[
			'.'+mask_descriptor.type_data[0]+
			'#'+mask_descriptor.id ];

		//if id whas provided, check also for dependency with id
		if( mask_descriptor.id ) {
			result = this.dep_map[ Packman.PRI( mask_descriptor ) ];	//get dependency object

			if(result instanceof Dep) {	//exists => append new data to arrays
				arr.uncommonPush(packs, result.packList( caller_pack ) );
				arr.uncommonPush(deps, result.depList( caller_pack ) );

				if(result.resolution_mods)
					block_all = result.resolution_mods['block_all'];
			}

			//block id from showing in next transforms to PRI
			mask_descriptor.id = undefined;
		}

		//check for every taxonomy related dependency, using pack data if exists
		//check interdependency modifiers
		for(i = descriptor.type_data.length,
			!block_all && i--;
			mask_descriptor.type_data.splice(i, i+1 );	//eliminar recursivamente
			) {

			result = this.dep_map[ Packman.PRI(mask_descriptor) ];	//get dependency object

			//handle dep type results
			if(result instanceof Dep){
				arr.uncommonPush(packs, result.packList( caller_pack ) );
				arr.uncommonPush(deps, result.depList( caller_pack ) );

				if(result.resolution_mods)
					block_all = result.resolution_mods['block_all'];

			}
			//TODO: handle dependency arrays and use fieldata to select acording to package data

		}

		return {deps: deps, packs: packs};
	}

	//deps( {obj:[descriptor | pack | PRI], packs}, callback )
	//retorna una lista con los paquetes que depende, ordenados
	//de forma incremental (si uno es dependencia del otro, este se pone posteriormente) y sin
	//	replicas
	//el resultado se debe recupera en un callback, puesto que los paquetes
	//pueden no estar configurados al obtenerse o requerirse su información
	//taxonómica
	//
	//funciona aglomerando los resultados de forma asincrónica en un objeto pasado
	//implícitamente como parámetro a cada llamado recursivo que se aplica sobre las
	//subdependencias posteriores, por lo que se debe recurperar el resultado con un callback.
	function depsFull( params, callback ) {
		var obj = params.obj,
			descriptor,	//PRI generator
			results,	//will hold deps return data
			asyncIterator,	//for calling recursively itself and call callback at the end, its iterator
				//to mantain packs and deps order.
			aglomerator = params.aglomerator,
			i = 0,
			length,
			callback = arguments[ arguments.length-1 ],
			arr = Packman.Arr;
		if(!callback.apply)
			callback = false;

		//initialize propagative object (will travel into recursions) for package aglomeration
		if(!aglomerator)
			aglomerator = params.aglomerator = {packs: []};

		//---initialize description object:
		//if direct descriptor delivered
		if( obj instanceof Object && obj.type_data)
			descriptor = obj;
		else {
			//initialize data from pack, otherwise initialize pack and then restart
			if( obj instanceof Pack && !obj.is.configured) {
				pack.configure(null, new Callback(
					depsFull,
					this,
					[params, callback]
				));
				return;
			}

			//if obj is pack and configured, or obj is PRI:
			if( obj intanceof Pack || obj instanceof String || typeof obj === 'string' )
				descriptor = description(obj);
			else
				return;
		}

		//we need type_data to do anything
		if(!descriptor.type_data)	{
			callback.apply();
			return;
		}


		//---Start adding packages into aglomeration object---//
		//get results and push new packs into current aglomeration object
		results = this.deps( descriptor );
		arr.commonLast(aglomerator.packs, results.packs );

		//if there are new dependencies, create an iterator for aglomerate them
		//in order. (more basic on the right), call them and finally run the callback
		if( results.deps.length ) {

			asyncIterator = new CallbacksIterator();
			//start adding the functions to iterate
			for(length = results.deps.length; i < length; i++) {
				asyncIterator.set({
					functions: new Callback(
						depsFull,
						this,
						{aglomerator: aglomerator, obj: results.deps[i]}
					)
				});
			}
			//add callback is exists
			if(callback)
				asyncIterator.set({
					callbacks: callback
				});

			asyncIterator.apply();
		}
		else if(callback.apply)
			callback.apply();
	}

		//pack
		//return closest Pack in pack_map to given PRI or Pack
		//it should be posible to get meta_packages (packages without id, only type_data)
		//which could be useful to manage ther type asociated packages
		function pack(object, depth) {
			var desc,
				pack; //hold result

			if(object typeof 'string' || object instanceof String || object instanceof Pack)
				desc = description(object);

			if( desc.type_data.length ) {
				if(desc.id)
					pack = pack_map[ desc.type_data[0]+'#'+desc.id ];	//sintaxis de paquete
				else
					pack = pack_map[ '.'+desc.type_data.join('.') ];	//sintaxis de ordenador
					//TODO: add sub meta_packages and depth handling

				return (pack)? pack : null;
			}
			return null;
		}

	//searches the closest type to the one asked for
	function type( type_data, decremental) {
		//sanitization
		type_data = ( typeof type_data === 'string' ) type_data.split(.).slice(1) : type_data;
		decremental = decremental || false;

		if(! type_data instanceof array)
			return null;

		//iteration variables for both cases
		var length = type_data.length,
			i = (decremental)? length : 0,
			typeString,
			type;

		//iterate decremental (length to 0) or incremental (0 to length-1)
		for(;
			(decremental)? i-- 			: i < length;
			(decremental)? void(0) 	: ++i ) {

			//Get tipes with index superior o lower than index
			typestring = (decremental)? taxonomy.slice(0,i) : taxonomy.slice(i);
			type = this.type_map[ '.'+typestring.join('.')  ];

			//if exists, return
			if(type) return type;
		}

		return null;
	}

	//returns type list corresponding to type_data from current type_map
	function taxonomy( type_data ) {
		//loop variables
		var length = type_data.length,
			i = length,
			taxonomy = [],
			type;

		while(i--) {
			type = this.type( type_data.slice(0,i+1) );
			if(type) taxonomy.unshift(type);
		}

		return taxonomy;
	}

	//will get if taxon exists
	function taxon( type_data ) {
		return this.taxon_map[ '.'+type_data.join('.') ];
	}

	//Returns PRI asociated to an abstract packman element description
	function PRI(descriptor) {
		var result = '';

		result += descriptor.object || '';

		if( descriptor.type_data )
			result += '.'+descriptor.type_data.join('.');

		result += JSON.stringify( descriptor.fields ) || '';

		if(descriptor.id)
			result += '#'+descriptor.id;

		return result;
	}

	//Retorna una descripción tipológica
	//(PRI, package, etc)
	//TODO, FIELD_SYNTAX : fallback && manejo sintaxis complejas (múltiples #, etc)
	function description(obj) {
		if(!obj) return;

		var descriptor = {
				object: undefined,
				type_data: undefined,
				fields: undefined,
				id: undefined
			};

		if(obj instanceof Pack) {
			descriptor.type_data = obj.taxon.typeData();
			descriptor.fields = obj.data.fields;
			descriptor.id = obj.id;
			return descriptor;
		}

		if(typeof obj === 'string' || obj instanceof String ) {
			var fields_start = obj.indexOf('{'),
				fields_end = obj.lastIndexOf('}'),
				fields = (fields_end)? obj.substring( fields_start, fields_end ) : null;

			if(fields) {
				descriptor.fields = JSON.parse(fields);
				obj = obj.replace( fields, '' );
			}

			var main = obj.split('#'),
				type_data = main[0].split('.');

			//id: exists, get
			if(main.length === 2)
				struture.id = parseInt(main[1],10);

			//objeto: existst, get
			if(type_data[0] !== '')
				descriptor.object = type_data[0];

			type_data.slice(1,type_data.length);

			//taxonomy, exists, get
			if(type_data.length)
				descriptor.type_data = type_data;
		}

		return descriptor;
	}

	//Dep (dependency)
	//Un objeto con información de resolución de dependencias
	//
	//list(pack)
	//	retorna la lista de dependencias que le corresponde a pack
	//
	//modificadores:
	//resolution_mods
	//	información que indica modificaciones a la resolución de la ruta de dependencias de los
	//	paquetes que le llamen
	//
	function Dep(  ) {

		//información taxonómica
		this.type_data = null;
		this.fields	= null;

		//información de dependencia
		this.resolution_mods = {};
		this.deps = [];
		this.packs = [];

	};
	Dep.prototype = {
		lists: function lists(pack) {
			return {
					deps: this.depList(pack),
					packs: this.packList(pack)
				};
		},
		depList: function depList(pack) {
			return this.deps;
		},
		packList: function packList(pack) {
			return this.packs;
		}
	};
	Dep.prototype.constructor = Dep;
	//Pack (descriptor de paquete):
	//sirve para resolver dependencias y pedirle al servidor su información completa
	//
	//identifier(depth = 0)
	//	retorna el nombre de identificación único, del tipo: "taxon#id"
	//		depth es el parametro pasado a typestring en el objeto taxon del packete
	//
	//taxon
	//	un objeto taxon con la información de tipo, normalmente es una referencia al objeto existente
	//	en el hash de typemap
	//
	//id
	//	número identificador del paquete
	//
	//obj is {bools}
	//		empty
	//		configured	//sus datos de configuración están cargados
	//		loaded	//cargados todos sus componentes.
	//		installed //instalado
	//		ocupy
	//
	//data
	//  aloja todo el contenido del paquete, y sus metadatos específicos
	//  field: campos o metadatos
	//  cualquier otro campo se considera el contenido principal
	Pack = function() {

		this.taxon	= null;
		this.id 	= null;

		this.is = {
			empty: true,
			configured: false,
			loaded: false,
			installed: false,
			ocupy: false,
		};

		this.data = {
			fields : {},	//samall, serialized, matchable data here
			//big objects next
		};

		this.packman = null;
	};
	Pack.prototype = {
		//Funciones de comportamiento:
		//Estas funciones determinan como el paquete se comporta, y dependen del metapaquete raíz
		//	y la taxonomia del paquete sobre el cual son llamados. Cada una pretende delimitar un tipo
		//	de operacion sobre el paquete.
		//pri(depth = 0)
		//	retorna el nombre de identificación único, del tipo: "tipo#id"
		//		depth es el parametro pasado a typestring en el objeto type del packete
		pri: function pri(depth) {
			depth = depth || 1;
			if(this.is.configured)
				return this.taxon.string(depth)+'#'+this.id

			return this.id;
		},
		setTaxon: function setTaxon(type_data) {
			//get configured type_data and configure taxon object
			var packman = this.packman,
			taxon = packman.taxon(type_data);

			//if it doesnt exists: create and add taxon to packman
			if(!taxon) {
				taxon = new Taxon( packman.taxonomy(type_data) );
				packman.add(taxon);
			}

			//set taxon
			this.taxon = taxon;
			//indicate taxon of new pack
			taxon.add(this);
		},
		//configure({ callback, reload, [, .. ] })
		//for download or generate package metadata and its taxonomy (taxon object)
		//para descargar o generar los metadatos del paquete y su taxonomia
		configure : function configure(params) {

			if(this.is.configured && !params.reload) {
				if(params.callback)
					params.callback.apply();
				return this;
			}

			if(this.is.ocupy || !this.packman)	return false;
			this.is.ocupy = true;

			//for getting type
			var desc;

			if(!this.is.configured) {
				//configure minimun tipology (type-id)
				//withouth type further type inference based on id cant be done on target environments
				//return false and stop
				desc = description(this.id);
					if( !desc.type_data ) {
						this.is.ocupy = false;
						return false;
					}
				//configure type
			  this.setTaxon( desc.type_data );
				this.id = desc.id;
			}

			//configure using typological defined behaviour
			var self = this,
				funcs = this.taxon.functionsList('configure'),
				//has to be executed on total finalization of configure functions
				releaser = 	[ new Callback(
						function() {
							this.setTaxon(this.taxon);

							this.is.configured = true;
							this.is.ocupy = false;
							},
						this
					)],
				iterator = new CallbacksIterator();

			//if callback exists, add to ending callback
			if(params.callback)
				releaser = releaser.concat(params.callback);

			//add callbacks to iterator
			iterator.set({
				callbacks: releaser,
				//add functions to iterator
				functions :
					funcs.map(function(element) {
						return new Callback(element, self, params);
					})
				});

			iterator.apply();
			return this;
		},
		//load({ callback, reload, [loadMods,] [, .. ] })
		//downloads or generates pack content, usualy an expensive operation
		load : function load(params) {

			if(this.is.loaded && !params.reload) {
				if( params.callback )
					params.callback.call();
				return this;
			}

			if(!this.is.configured)
				return this.configure( {
					callback: new Packman.Callback(
						function(params) {this.load(params);},
						this,
						[params]
					)
				} );

			//try to check atomically xd
			if(this.is.ocupy)	return false;
			this.is.ocupy = true;

			//get correct functions and execute with parameters and context sincronously
			var self = this,
				funcs = this.taxon.functionsList( fname ),
				releaser = [ new Packman.Callback(
					function() {
						this.is.loaded = true;
						this.is.ocupy = false;
					},
					this)
				],
				iterator = new CallbacksIterator();

			if(params.callback)
				releaser = releaser.concat(params.callback);

			//add callbacks to iterator
			iterator.set({
				callbacks: releaser,
				//because no modifier tag has been implemented,
				functions:
					funcs.map(
						function(element){
							return new Callback(element, self, params);
						});
				}
			);

			iterator.apply();
			return this;
		},
		//install( { callback, [installConfs] } ):
		//installConfs : {definido por llamado, installMods}
		//	se el agrega installMods calculado a partir de los modificadores de la taxonomia
		//instalación en este contexto se refiere a conectar el paquete ya descargado a su entorno de
		//		ejecución y desplegar su contenido en el sistema, conectarse a otros paquetes, etc
		//	state = installed;
		//
		install : function install(params) {

			if(this.is.installed && !params.reinstall) {
				if(params.callback)
					params.callback.call();
				return this;
			}

			if(!this.is.loaded)
				return this.load({
					callback: new Packman.Callback( function(params) {
						this.install(params);
					}, this,
					[params])
				});

			if(this.ocupy)	return false;
			this.is.ocupy = true;

			var self = this,
				funcs = this.taxon.functionsList('install'),
				releaser = [ Packman.Callback(function() {
						this.is.ocupy = false;
					}, this) ],
				iterator = new CallbacksIterator();

			//callback, existe: agregar
			if( params.callback )
				releaser = releaser.concat(params.callback);

			iterator.set({
				callbacks: releaser,
				functions:
					funcs.map(
						function(element) {
							return new Callback(element, self, params);
						})
			})

			iterator.apply();
			return this;
		},
		//update({callback, full, [configure, load, install] params}):
		//por cosas de rendimiento, se puede especificar como una alternativa a confgure, load, install
		//	con reload = true;
		update : function update(params) {

			//////////////////////////////////////////////// comportamientos alternos
			var configureCallback, loadCallback, installCallback,
				configureConfs, loadConfs;

			//if full = true, will make a configure, load, install with indicated mods has
			//params to the functions, one at a time, from configure to install
			if(params.full) {

				//instanciar valores mínimos
				if(!params.configureConfs)
					configureConfs = params.configureConfs = {};

				if(!params.loadConfs)
					loadConfs = params.loadConfs = {};

				if(!params.installConfs)
					params.installConfs = {};

				//create chainers of asincronous code execution, that take into account
				//previusly existing callbacks (ideally a callbacksgroup type, TODO)
				configureCallback = new Callback(function() {
						this.load(params.loadConfs);

						if(configureConfs.callback_old)
							configureConfs.callback_old.apply();
						}, this
					);
				loadCallback = new Callback(function() {
						this.install(params.installConfs)

						if(loadConfs.callback_old)
							loadConfs.callback_old.apply();
						}, this
					);

				//add callbacks to parameters to generate chaining
				configureConfs.callback_old = configureConfs.callback
				configureConfs.callback = configureCallback;

				loadConfs.callback_old = loadConfs.callback;
				loadConfs.callback = loadCallback;

				//llamar
				this.configure( params.configureConfs );
				return this;
			}

			//verify pre-installation
			if(!this.is.installed)
				return this.install({
					callback: new Callback(function(params) {
						this.update(params);
					}, this,
					[params])
				});

			//trying to be atomic xd
			if(this.is.ocupy)	return false;
			this.is.ocupy = true;

			//same logic as in configure, etc.
			var self = this,
				funcs = this.taxon.functionsList('update'),
				releaser = [new Callback(function() {
					this.is.ocupy = false;
				}, this)],
				iterator = new CallbacksIterator();

			if(params.callback)
				releaser = releaser.concat(params.callback);

			iterator.set({
				callbacks: releaser,
				functions: funcs.map(function(func){
					return new Callback(func, self, params);
				})
			});

			iterator.apply();
			return this;
		}
	};
	Pack.prototype.constructor = Pack;




		//Type (descriptor de tipo)
		//contiene el comportamiento e información de un tipo, todos los campos son
		//	opcionales, caso en que se usara su version del tipo contenedor, cuando se itere
		//	al próximo
		//
		////////////////////////////////////////////////////////////////
		//Funciones de comportamiento, todas son opcionales
		//configure({ callback, context, reload[, .. ] })
		//load({ callback, context, reload[, .. ] })
		//install( installConfs )
		//update()
		//
		//Configuradores de funciones de comportamiento, todos opcionales:
		//permiten modificar el comportamiento por defecto de la forma de controlar la
		//	resolución de comportamiento taxonómico
		//ademas se heredan de forma incremental, y se pueden definir dentro de los install
		//	para modular el comportamiento
		//de la función base.
		//obj configureMods
		//obj loadMods
		//obj installMods
		//obj updateMods
		//obj allMods
		//		especifica modificaciones a la forma de usar todos los modificadores, = a
		//			escribirlo en todos ellos
		//Mods:
		//		string execute_after_[typefullname|meta] 	//ejecutar el script despues del definido
		//		string block_[typefulltypename|meta] 		//bloquea un script de tipo posterior
		//		bool block_all				//indica que no se debe continuar ejecutando tipos posteriores
		//
		function Type(type_data) {

			this.type_data = (type_data)? type_data : null;
		}
		Type.prototype.string = function string(depth, fields) {
			depth = (depth !== undefined)? depth : 1;

			return '.' + this.type_data.slice(-depth).join('.');
		};





		//Taxon (configuración de tipo)
		//	es una configuración o concatenación particular de clases, el
		//	orden puede o no ser relevante.
		//
		//taxonomy
		//	lista de tipos que representan la taxonomia del taxon
		//		cada elemento es un tipo, que puede venir acompañado de delimitadores
		//		de campo
		//		en tal caso será un array con el tipo como primer elemento, y los delimitadores
		//			en los elementos siguientes.
		function Taxon(taxonomy) {

			this.taxonomy = [];
			this.type_data = '';
			this.packman = null;
			this.packs = {};

			if( taxonomy )
				this.setTaxonomy();
		}

		Taxon.prototype = {
			//string(depth = 1)
			//	retorna el tipo del paquete, con depth como profundidad taxonomica
			//	depth: profundidad taxonómica (string | int)
			//		string: 'full'
			setTaxonomy: function(taxonomy) {

				if ( taxonomy instanceof Array ) {

					if( taxonomy[0] instanceof Type )
						this.taxonomy = taxonomy;
					else if( typeof taxonomy[0] === 'string' )
						this.taxonomy = taxonomy( taxonomy );

				}
				else if( typeof taxonomy === 'string' || taxonomy instanceof String )
					this.taxonomy = taxonomy( taxonomy );

				if(this.taxonomy.length)
					this.type_data = this.typeData();
			},
			pri: function pri(depth) {
				depth = depth || this.taxonomy.length;
				return '.'+this.typeData().slice(0,depth).join('.');
			},
			typeData: function(depth) {
				depth = depth || this.taxonomy.length;
				return this.taxonomy.map(function(type) {return type.string();});
			},
			taxonomySimplified: function taxonomySimplified(depth) {
				depth = depth || this.taxonomy.length;

				return this.taxonomy.map(function(type) {return type.string();}).slice(0,depth);
			},
			//typeof(Type)
			//	true if this type is subset of taxon parameter
			typeOf: function(taxon) {
				var i = taxon.taxonomy.length;

				if(taxon.taxonomy.length > this.taxonomy.length) return false;

				for(; i--;)
					if( this.taxonomy[i] !== taxon.taxonomy[i] )
						return false;

				return true;
			},
			//props(function)
			//	returns prop list or [type, prop] list of properties taxonomically ordered
			props: function(prop, include_meta, hash) {
				if(!prop)	return [];

				var props = [],
					i = this.taxonomy.length,
					property = null,
					meta_type = this.packman.type_map[meta_type];

			  while(i--) {
					property = this.taxonomy[i][prop];

					if(property !== undefined && property !== null)
						props.unshift( (hash)? [ this.taxonomy[i], property ] : property );
				}

				if(!!include_meta && metaProp !== undefined)
						props.unshift( (hash)? [meta_type, meta_type[prop] ] : meta_type[prop] );

				return props;
			},
			//returns executable ordered list corresponding to programed behavior of the taxon
			functionsList: function functionsList(fname) {
				var funcs = this.props(fname, true, true);
					i = funcs.length,
					mods_str = fname+'Mods';
					type,
					mods,
					block_all = false,
					functions = [];

				while(i-- && !block_all ) {
					type = funcs[i][0]
					functions.concat( funcs[i][1] );

					//handle modifiers
					if(type && type.[mods_str]) {
						mods = type.[mods_str];
						block_all = mods.block_all;
					}

				}

				return functions;
			},
			//will add given packs into taxonomy hash;
			add: function(packs) {
				var i, identifier;

				if(packs instanceof Pack) {
					identifier = packs.identifier();

					if( !this.packs[ identifier ] && packs.taxon = this)
						this.packs[ identifier ] = packs;
				}
				else 	if(packs instanceof Array) {
					for(i = packs.length; i--;) {
						identifier = packs[i].identifier;

						if( !this.packs[ identifier ] && packs[i].taxon = this )
							this.packs[ identifier ] = packs[i];
					}
				}

				return this;
			}
		};
		Taxon.prototype.constructor = this.Packman.Taxon;

	//FieldDescriptor
	//Describe los rangos o valores aceptables para que un objeto data exprese un estado
	//
	//
	function FieldsDescriptor( descriptor ) {
		this.set(descriptor);
	}
	FieldsDescriptor.prototype = {
		//check if data matches field description
		match: function match(data) {

			var field,
				thisfield,
				datafield;

			//para cada campo mutuamente definido
			for( field in this ) if( this.hasOwnProperty( field ) ) {
				if( !data.hasOwnProperty(field) )	return false;

				thisfield = this[field];
				datafield = data[field];

				//que esté en array de valores
				if( thisfield instanceof Array ) {
					if( thisfield.indexOf(datafield) === -1 )
						return false;
				}
				//que encaje con parametros de descripción
				else if( typeof thisfield === 'object' ) {

					//if value is in eq array
					if( thisfield.eq )
						if( thisfield.eq.indexOf(datafield) === -1 )
							return false;

					//if number is in range
					if( typeof datafield === 'number' ) {
						if( datafield <= thisfield.gt || datafield >= thisfield.lt )
							return false;
					}

					//if string matches regexp
					if( typeof datafield === 'string' && thisfield.regexp ) {
						return thisfield.regexp.test(datafield);
					}

				}
				if(thisfield instanceof FieldDescripto) {
					if(!datafield instanceof object)
						return false;

					if(! thisfielf.match( datafield ) )
						return false;
				}


				//que sean iguales
				else if (thisfield !==  datafield) return false;
			}

			return true;
		},
		//add description information for matching
		set: function set( description ) {
			var field,
				thisfield;

			//para cada campo existente en el descriptor
			for(field in description) if( description.hasOwnProperty(field) ) {
				thisfield = this[field] = description[field];
			}
		}
	}
	FieldsDescriptor.prototype.constructor = FieldsDescriptor;


	//Obj Callback
	//un objeto descriptor de callback de función
	//para llamarlo se usa call, usara sus propiedades para
	function Callback(callback, target, params) {
		this.callback = callback;
		this.target = target;
		if(params.length)
			this.params = params;
		else if(params !== undefined)
			this.params = [params];
		else
			this.params = [];
	}

	//la función de llamado, ejecuta la funcion preconfigurada con target o global si no se
	//	entrega, [mas los parametros]
	Callback.prototype.global = ( function () {return this;} )();
	Callback.prototype.apply = function apply() {
		if(!this.callback)
				return;

		this.callback.apply(
			(this.target)? this.target: this.global,
			(this.params instanceof Array)? this.params: []
		);
	};
	Callback.prototype.appendCallback = function appendCallback( callback ) {
		length = this.params.length,
		param_f = this.params[length-1],
		param_new;

		//if a callbacks container, add to callbacks, else, create a container and concat.
		if( param_f instanceof CallbacksShepherd || param_f instanceof CallbacksIterator )
			param_f.set({callbacks: callback});
		else if( param_f instanceof Callback ) {
			param_new = this.params[length-1] = new CallbacksShepherd();
			param_new.set( {callbacks: [callback, param_f] } );
		}

		//if the parameters where object-like
		else if( param_f.constructor === Object  ) {
			//sanitize param_f into callback contained in param_f (object-like)
			param_f = (param_f.callback)?
				param_f.callback :
				param_f.callback = new CallbacksShepherd();

			//repeated code ... :c
			if( param_f instanceof CallbacksShepherd || param_f instanceof CallbacksIterator )
				param_f.set({callbacks: callback});
			else if( param_f instanceof Callback ) {
				param_new = this.params[length-1] = new CallbacksShepherd();
				param_new.set( {callbacks: [callback, param_f] } );
			}

		}
		else
			this.params.push( callback );
	};

	//dos formas de manejar los callbacks, cuando se presenta
	//una situación de múltiples funciones (que aceptan callback)
	//tras las cuales deben llamarse los callbacks:
	//
	//ejecutar todas simultáneamente, y al terminar todas ellas ejecutar el(los) callback(s)
	//ejecutar una lista de forma ascendente y al terminar la última ejecutar el(los) callback(s)
	//todos los callbacks ingresados deben respetar la interfaze de ejecutar su último parámetro
	//como un callback que implementa call(), de otra forma el flujo de ejecución asincronico no
	// se completa

	//Will execute every function simultaously, and in the end of all will execute
	//normal callbacks given
	function CallbacksShepherd(params) {

		CallbackGroup.call(this, params);

		this.instances = 0;
		this.ticker = new Callback(
			this.tickerFunction,
			this);
	};
	CallbacksShepherd.prototype = (function() {
		var proto = Object.create(CallbackGroup.prototype);
		proto.constructor = CallbacksShepherd;
		//starts functions execution
		proto.apply = function apply() {
			if(!this.functions.length || !this.callbacks.length)	return false;

			var i = this.instances = this.functions.length,
					f;

			//execute every function with the counter as its callback
			while(i--)	{
				f = this.function[i];

				f.appendCallback(this.ticker);
				f.apply();
			}

			return true;
		};
		//decrease counter by one
		proto.tickerFunction = function tickerFunction() {
			if(!--this.instances)
				this.finalize();
		};
		return proto;
	})();

	//Will execute given function callbacks in the order the where given, from
	//0 to length, and in the end, fill execute normal callbacks.
	function CallbacksIterator(params) {

		CallbacksGroup.call(this);

		this.current = 0;
		this.iterator = new Packman.Callback(
			this.iteratorFunction,
			this
		);
	};
	CallbacksIterator.prototype = (function() {
		var proto = Object.create(CallbacksGroup.prototype);
		proto.constructor = FunctionIterator;
		//starts iterating, returns true if there are functions to
		//iterate, false otherwise
		proto.apply = function apply() {

			if(!this.functions.length)
				return false;

			this.iterator.apply();
			return true;
		};
		//when called executes next function with itself as callback
		//when there are no callbacks left, finalizes
		proto.iteratorFunction = function iteratorFunction() {
			var f;

			if(this.current < this.functions.length ) {
				f = this.functions[this.current];

				f.appendCallback(this.iterator);
				f.apply();

				this.current++;
			}
			else
				this.finalize();

		};
		return proto;
	})();

	//Gives common interface to callback grouper objects, so they are in the surface
	//another form of a common callback object.
	//Only defines they have a list of callbacks and other of functions
	//and the general accesor function set to them.
	//It is not intended for objects of this type to exist
	function CallbacksGroup(params) {
		this.callbacks = [];
		this.functions = [];
		if(params)	this.set(params);
	}
	CallbacksGroup.prototype = (function() {
		var proto = Object.create(Callback.prototype);
		proto.constructor = CallbacksGroup;

		//adds params.functions and params.callbacks to internal lists
		proto.set = function set(params) {
			if(params.functions)	this.functions.concat(params.functions);
			if(params.callbacks)	this.functions.concat(params.callbacks);
		};
		//executes every callback in callbacks list
		proto.finalize = function end() {
			if(!this.callbacks.length)	return false;

			var i = this.callbacks.length;

			while(i--)
				this.callbacks[i].apply();
		};
		//substitues callback definition of appendCallback.
		proto.appendCallback = function appendCallback(callback) {
			this.set({callbacks: callback});
		};

		return proto;
	})();

	//Array helper functions
	var Arr = (function() {

		//will delete every common element
		function commonDelete(arr1, arr2) {
			var i = arr2.length,
				index;

			while(i--)
				if( (index = arr1.indexOf(arr2[i])) !== -1 )
					arr1.splice(index, 1);
		}
		//will push every uncommon element
		function uncommonPush(arr1, arr2) {
			var i = arr2.length;

			while(i--)
				if( arr1.indexof( arr2[i] ) === -1 )
					arr1.push( arr2[i] );
		}
		//will append every uncommon alement, and take que common ones to the end
		function commonToLast(arr1, arr2) {
			var i = arr2.length,
				index;

			while(i--)
				if( (index = arr1.indexOf( arr2[i] )) !== -1 )
					arr1.splice( index, 1 );

				arr1.push( arr2[i] );
		}

		return {
			commonDelete: commonDelete,
			uncommonPush: uncommonPush,
			commonToLast: commonToLast
			};
	})();

	//Rpc
	//TODO TODO TODO, remove jQuery dependency
	//indicates link configuration and call methods, its a proxi to XHR
	//it can hold multiple calls to make all of them once if necesary
	//	url 	//url to ask
	//	format  //response format
	//	action_prefix //prefix to action field
  function Rpc() {

  	this.url = null;
  	this.format = 'json';
  	this.action_prefix = 'packman';

		this.agglomerating : false;
		this.calls : [];
  }
  Rpc.prototype = {
		//global, general usage XHR polyfill/proxy
		XHR: {
			post : function post(params) {
				jQuery.post(
					params.url,
					params.data,
					params.callback,
					params.format
				);
				return this;
			}
		},
  //call({data, callback, context})
	//	ejecuta un llamado asincrónico con la configuración
  	call : function(params) {
  		if(!jQuery || !this.url || !params.data.action || !params.data.callback)
    		return false;

    	params.data.action += (this.action_prefix)? this.action_prefix : '';

			//if agglomerating, agglomerate
			if(this.agglomerating) {
				this.calls.push(params);
				return this;
			}

    	this.XHR.post( {
    		this.url,
    		params.data,
    		params.callback,
    		this.format
			});

			return this;
    },
    startAgglomeration: function startAgglomeration() {
			this.agglomerating = true;
			return this;
		},
		endAgglomeration: function endAgglomeration() {
			this.agglomerating = false;
			return this;
		},
		//calls all aglomerated objects
		apply: function apply(callback) {
			var iterator = new CallbacksIterator(),
				//the one executed for every agglomerated parameter
				xhrParametrize = function(params) {
					this.XHR.post( {
		    		this.url,
		    		params.data,
		    		params.callback,
		    		this.format
					});
				},
				calls = this.calls,
				i = 0,
				length = calls.length;

			for(; i < length ; i++) {
				iterator.set({
					callbacks: new Callback(
						xhrParametrize,
						this,
						calls[i]
					)
				});
			}

			if(callback)
				iterator.set({ functions: callback });

			iterator.apply();

			return this;
		}
  };
  Rpc.prototype.constructor = Rpc;


	Packman.prototype = {
		deps: deps,
		depsFull: depsFull,
		type: type,
		taxonomy: taxonomy,
		taxon: taxon,
		pack: pack
	};
	Packman.prototype.constructor = Packman;

	//Packman API
	Packman.PRI = PRI;
	Packman.description = description;

	//Core objects
	Packman.Dep = Dep;
	Packman.Pack = Pack;
	Packman.Type = Type;

	//Utility objects
	Packman.Taxon = Taxon;
	Packman.FieldsDescriptor = FieldsDescriptor;
	Packman.RPC = RPC;

	//Internal APIs
	Packman.Arr = Arr;

	//Callbacks API
	Packman.Callback = Callback;
	Packman.CallbacksIterator = CallbacksIterator;
	Packman.CallbacksShepherd = CallbacksShepherd;



	return Packman;
})();


(function() {
	//play()
	//inicia Packman, con la configuración indicada
	//	por defecto como un admiinstrador de elementos html, también podría ser de scripts, objetos
	//	internos o incluso otros modelos, o administradores de paquetes, como si mismo con otras
	//	configuraciones
	//
	//	verifica packmanConfig
	//	genera hashes y objetos built-in
	//	ejecuta install sobre root
	function play(packmanConfig) {

	}

	//install( [list:][packs|identifier|cuantitytypeidentifier] [, confs | [conf1, conf2, ..] ] )
	//instala los paquetes resolviendo las dependencias
	//ejecuta packman.install para cada identifier asociado a los packs, con los confs o lista de
	//	confs
	//
	//identifier:
	//mapea el arbol de dependencias y lo instala incrementalmente
	//	revisa paquetes previamente instalados
	//
	//cuantitytypeidentifier:
	//acepta un tipo, taxonómico o no, con modificadores de query
	//	para instalar una cantidad de objetos del tipo dado
	//	es de la forma:
	//		type[[propertyfilters]querymods]
	//		los querymods tienen el prefijo get_:
	//			quantity, offset
	//le pide al servidor los identifiers asociados
	//ejecuta install(identifier[, confs | confn]) para cada uno
	//
	//confs:
	//Configuración que se le es pasada al instalador, en formato JSON
	//
	function install( param ) {
		if()
	}

	///////////////////////////////////////////////////////Root pack
	function RootPack() {

		packman.Pack.apply(this, arguments);

		this.is: {
			empty: false,
			configured: true,
			loaded : true,
			installed:true,
		}

		this.configure = this.load = this.install = this.update = (function() {});

	}
	RootPack.prototype = packman.Pack.prototype;

	///////////////////////////////////////////////////////Metatipo
	function MetaType() {

		packman.Type.apply(this, arguments);

		this.taxonomy = [meta_type];

	}
	MetaType.prototype = packman.Type.prototype;

	///////////////////////////////////////////////////////Root pack type
	function RootPackType() {

		packman.Type.apply(this,arguments);

		this.taxonomy = [root_pack_type];
	}
	MetaType.prototype = packman.Type.prototype;

	///////////////////////////////////////////////////////Packager meta config descriptor
	function MetaData() {
		this.root = new RootPack();
		this.root_type = new RootPackType();
		this.type = new MetaType();
	}

	///////////////////////////////////////////////////////Built-in objects
	builtin = (function () {

		var meta;

		meta = (function(){

			var html,
				script;

			html = new MetaData();		html.type.configure = function() {

			};

			html.type.load = function() {

			};

			html.type.install = function() {

			};

			script = new MetaData();

			return {
				html : html
				script : script
			};
		}());


		return {
			meta : meta
		};
	}());

})();


/////////////////////////////////////////////////////////////////////TODO

////////////////////////////////////////////////FIELDS_SYNTAX
//	Crear una sintaxis de selección de campos, anidable
//	en cadena de tipos PRI:
//
//soporte:
//	equivalencias -> base
//	rangos	-> base
//	funciones de mapeo -> flexibilidad
//	punteros a selección de campos -> rehutilizacón

//////////////////////////propuesto:
//////////////(1)
//array de objetos de descripción de
//campo (fieldDescriptorArray), JSON.stringify, usable como parametro, etc
//
//[{},{},{},{}]
//descriptor de campos:
//name : string
//lt: number
//gt: number
//eq: Array[valores]
//map: bool function(val) {..}
//
//
//FALLBACK (notación alterna):
//
//[ fieldname:op:val[, ..] ]
//op: =, <=, >=, <, >
//conversión a fieldDescriptorArray
//
//////////////2)
//objeto descriptor de Pack.data
//[ [{},{},{}[,..]] | {} ]
//{} = JSON.stringify(fieldObj)undefined
//fieldobj =
//field : value
//field : [value1, value2[, ..] ]
//field : objFieldDescriptor
//FieldDescripto:
//	lg, gt, eq
//
//
////////////////////////////////////////////////TYPE_FIELDS
//	Que tal extender la selección de campos a los tipos
//	en tipos y taxonomias
//	Es contrario al diseño?, dar ejemplos
//
//	Typemap:
//	.type1 = .type1
//	typeA = .tipe1.type2
//	typeB = .Tipe1.Tipe2{fieldselector} -> .Tipe1.type2.type3
//
//	PackA.Taxon =
//	type1.typeA.typeB
//
//	Utilidad??
//	Encontrar utilidad
//	Mantener implementabilidad ? Sí
//
//
