
/*
	PACKMAN 0.5
	By Nicolás Narváez

	Pensado como un complemento a los cms´s, permite que un sitio se carge dinamicamente al navegarlo
	haciendo pedidos ajax de los contenidos que se van requiriendo. Estos estan descritos como paquetes con dependencias
	que son a su ves mas contenido que se resuelve por ajax. Cada contenido indica como debe incrustarse en los otros
	a traves de su tipo o información extra especial. El sistema de dependencias esta basado en pares de tipo y identificador
	que en condiciones normales representan la tabla y el id del elemento, pero se puede extender o modificar a partir
	de metainformación en los mismos contenidos que es mapeada de forma transparente en tipos taxonómicos.
	El contenido luego se instala resolviendo dependencias en la pagina actual según los scripts asociados a su tipo taxonómico.

	Packman guarda algo de metainformación cuando la va cargando para resolver los pedidos siguientes, y mantiene un mapa
	vivo de referencias entre los elementos html que indica su interdependencia y permite seguir "instalando" contenido.

	////////////////////////////////////////////////////////////////////Uso-funcionamiento:
	La forma del arbol de dependencias es la forma del sitio, su estrucutra.
	La resolución de dependencias se usa al requerir un contenido (habilitarlo).
	La resolución de placeholders se usa al instalar un contenio (completarlo).

	Hay objetos o tipos de objetos que no tienen dependencia concluyente.
	Al guardarse contenido con placeholders, los objetos que contienen los placeholders serán añadidos a la lista
	de contenedores de los objetos referenciados. Ademas se pueden incluir etiquetas en los placeholders que añaden
	funcionamiento, como el forzar dependencia del contenedor.
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

(function() {

	var meta_type = '__meta_type__',
		root_pack_type = '__root_pack__',
		dep_map = {},
		pack_map = {},
		type_map = {};

	this.Packman = {

		rootType: undefined;
		rootPack: undefined;


		//Depmap (mapa de dependencias):
		//es un hash que relaciona un identificador (ordenador, metapaquete, identificador
		//	único, identificador taxonómico con distintas profundidades, etc) con un objeto dep.
		this.depmap: {};

		//Packmap (mapa de paquetes):
		//es un hash { 'identificador' : pack[, ..] }
		//que contiene los paquetes cargados en packman, identificador = type-id
		this.packmap: {};

	};

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

	//Returns PRI asociated to an abstract packman element description
	function PRI(descriptor) {
		var result = '';

		result += descriptor.object || '';

		if( descriptor.type_data )
			result += '.'+descriptor.type_data.join('.');

		result += JSON.stringify( descriptor.fields ) || '';

		if(descriptor.id)
			result += '#'+descriptor.id;
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
			}

		if(obj instanceof Pack) {
			descriptor.type_data = obj.taxon.taxonomySimplified();
			descriptor.fields = obj.data;
			descriptor.id = obj.id;
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
			if(type_data[0] !== '') {
				descriptor.object = type_data[0];
				type_data.slice(1,type_data.length);
			}

			//taxonomy, exists, get
			if(type_data.length)
				descriptor.type_data = type_data;
		}

		return descriptor;
	}

	//add(Pack | Type | Dep)
	//agrega un objeto pack a packmap
	//ademas completa y repara datos, es
	//por donde se deben agregar todos los packs preconfigurados para su verificación
	//se puede reimplementar o configurar con un packmanConfig
	function add(obj) {
		if(obj instanceof Type) {

		}
		if(obj instanceof Pack) {

		}
		if(obj instanceof Dep) {

		}


	}





	//Dep (dependency, dependencia)
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

	}
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
	}
	Dep.prototype.constructor = Dep;


	//Returns an object
	//return {deps, packs}
	//deps: the subdependencies of the dependency
	//packs: the packs to which the dependency links
	function deps(descriptor) {
		if(!descriptor.type_data)
			return;

		var mask_descriptor = {},
			caller_pack,
			i,
			result,
			packs, deps,
			block_all = false;

		mask_descriptor.id = descriptor.id;
		mask_descriptor.type_data = descriptor.type_data;

		caller_pack = this.pack_map[
			'.'+mask_descriptor.type_data[0]+
			'#'+mask_descriptor.id ];

		if(mask_descriptor.id) {
			result = this.dep_map[ Packman.PRI(mask_descriptor) ];

			if(result) {
				packs.concat( result.packList( caller_pack ) );
				deps.concat( result.depList( caller_pack ) );

				if(result.resolution_mods)
					block_all = result.resolution_mods['block_all'];
			}

			mask_descriptor.id = undefined;
		}

		for(i = descriptor.type_data.length,
			!block_all && i--;
			mask_descriptor.type_data = mask_descriptor.type_data.slice(0, -1);) {

			result = this.dep_map[ Packman.PRI(mask_descriptor) ];

			if(result instanceof Dep){
				packs.concat( result.packList( caller_pack ) );
				deps.concat( result.depList( caller_pack ) );

				if(result.resolution_mods) {
					block_all = result.resolution_mods['block_all'];
				}

			}

		}

		return {deps: deps, packs: packs};
	}

	//deps( {obj:[descriptor | pack | PRI], callback} )
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
	function depsFull( params ) {

		var descriptor,
			results = [];

		//inicializar objeto propagativo de aglomeración de paquetes
		if(!params.packs)
			params.packs = [];

		//inicializar datos desde PRI
		if(typeof params.obj === 'string' || params.obj instanceof String) {
			id = description(params.obj);

			taxon = (id.taxonomy) new Taxon(id.taxonomy) : null;
			fields = id.fields || null;
			id = id.id || null;

		}

		//inicializar datos desde Pack, configurar si no lo esta y continuar
		if( taxon instanceof Pack )
			if( !pack.is.configured ) {
				pack.configure({callback: new Callback(
					function() {},
					this,

				)});
				return;
			}


		if(!taxon)	{
			params.callback.params.push( params.deps )
			params.callback.apply();
			return;
		}

		results = deps(description);
	}

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
			field : {},
		};
		this.functionShepherdHash = {
		};
	};
	Pack.prototype = {
		//propiedades globales
		//packman : dirección al packmanager que contiene el paquete
			packman : null,
		//Funciones de comportamiento:
		//Estas funciones determinan como el paquete se comporta, y dependen del metapaquete raíz
		//	y la taxonomia del paquete sobre el cual son llamados. Cada una pretende delimitar un tipo
		//	de operacion sobre el paquete.
		//identifier(depth = 0)
		//	retorna el nombre de identificación único, del tipo: "tipo#id"
		//		depth es el parametro pasado a typestring en el objeto type del packete
		identifier: function identifier(depth) {
			if(this.taxon)
				return this.taxon.(depth)+'#'+this.id

			return this.id;
		},
		functionShepherd: function functionShepherd(params) {
			if(!params.target)
				return;

			var shepherd,
				i;

			if( !this.functionShepherdHash[ params.target] )
				this.functionShepherdHash[ params.target] = {
					callbacks : [],
					number : 0
				}

			shepherd = this.functionShepherdHash[params.target];

			if(params.number)
				shepherd.number += params.number;
			if(params.callbacks)
				shepherd.callbacks = shepherd.callbacks.concat(params.callbacks);

			if(!shepherd.number)
				for(i = shepherd.callbacks.length; i--;)
					shepherd.callbacks[i].apply();
		},
		//configure({ callback, reload, [, .. ] })
		//para descargar o generar los metadatos del paquete y su taxonomia
		configure : function configure(params) {

			if(this.is.ocupy)	return false;

			if(this.is.configured && !params.reload) {
				if(params.callback)
					params.callback.apply();
				return;
			}
			this.is.ocupy = true;

			if(!this.is.configured) {
				//configurar tipologia mínima
				var PRI = this.packman.description(this.id);
					if( !PRI.taxonomy ) {
						this.is.ocupy = false;
						return false;
					}

				this.taxon = new Packman.Taxon(PRI.taxonomy);
				this.id = PRI.id;
			}

			//configurar en base a tipología
			var mods = this.taxon.props('configureMods', true, true),
				funcs = 	this.taxon.props('configure', true, true),
				length = funcs.length,
				i = length,
				fname = 'configure',
				releaser = 	[ new Packman.Callback(
						function() { this.is.ocupy = false; },
						this
					)];

			//agregar callback si existe al liberador del paquete
			if(params.callback)
				releaser = releaser.concat(params.callback);

			//configurar el pastor, y el callback que avanzara el contador
			this.functionShepherd({
				target: 	fname,
				number: 	length,
				callbacks: 	releaser
			});
			params.callback = new Packman.Callback(
				function() {
					this.functionShepherd({
						target: fname,
						number: -1
				});
				},
			this);

			while(i--)
				funcs[length-i-1][1].apply( this, params );

		},
		//load({ callback, reload, [loadMods,] [, .. ] })
		//descarga o genera el contenido del paquete, usalmente una operación más costosa.
		load : function load(params) {

			if(this.is.ocupy)	return false;

			if(this.is.loaded && !params.reload) {
				if( params.callback )
					params.callback.call();
				return;
			}

			if(!this.is.configured)
				return this.configure( {
					callback: new Packman.Callback(
						function(params) {this.load(params);},
						this,
						[params]
					)
				} );

			this.is.ocupy = true;

			var mods = this.taxon.props('loadMods', true, true),
				funcs = this.taxon.props('load', true, true),
				length = funcs.length,
				i = length,
				fname = 'load',
				releaser = [ new Packman.Callback(
					function() {
						this.is.ocupy = false;
					},
					this)
				];

			if(params.callback)
				releaser = releaser.concat(params.callback);

			//configurar el pastor, y el callback que avanzara el contador
			this.functionShepherd( {
				target: 	fname,
				number: 	length,
				callbacks: 	releaser
			} );

			params.callback = new Packman.Callback(
				function() {
					this.functionShepherd( {
						target: fname,
						number: -1
					} );
				},
				this
			);

			while(i--)
				funcs[length-i-1][1].call( this, params );
		},
		//install( { callback, [installConfs] } ):
		//installConfs : {definido por llamado, installMods}
		//	se el agrega installMods calculado a partir de los modificadores de la taxonomia
		//instalación en este contexto se refiere a conectar el paquete ya descargado a su entorno de
		//		ejecución y desplegar su contenido en el sistema, conectarse a otros paquetes, etc
		//	state = installed;
		//
		install : function install(params) {

			if(this.ocupy)	return false;

			if(this.is.installed && !params.reinstall) {
				if(params.callback)
					params.callback.call();
				return;
			}

			if(!this.is.loaded)
				return this.load({
					callback: new Packman.Callback( function(params) {
						this.install(params);
					}, this,
					[params])
				});

			this.is.ocupy = true;

			var mods = this.taxon.props('installMods', true, true),
				funcs = this.taxon.props('install', true, true),
				length = funcs.length,
				i = length,
				fname = 'install',
				releaser = [ Packman.Callback(function() {
						this.is.ocupy = false;
					}, this) ];

			//callback, existe: agregar
			if( params.callback )
				releaser = releaser.concat(params.callback);

			//configurar el shepherd de funciones
			this.functionShepherd({
				target: fname,
				number: length,
				callbacks: releaser
			});

			//crear el timer del shepherd
			params.callback = new Packman.Callback( function() {
				this.functionShepherd({
					target: fname,
					number: -1
				});
			}, this );

			//ejecutar las funciones
			while(i--)
				funcs[length-i-1][1].call(this, params);

		},
		//update({callback, full, [configure, load, install] params}):
		//por cosas de rendimiento, se puede especificar como una alternativa a confgure, load, install
		//	con reload = true;
		update : function update(params) {

			//////////////////////////////////////////////// comportamientos alternos
			//vaaars
			var configureCallback, loadCallback, installCallback;

			//encapsulación de mutaciones
			if(this.is.ocupy)	return false;

			//si hacer un configure, load, install con los confs indicados
			if(params.full) {

				//instanciar valores mínimos
				if(!params.configureConfs)
					params.configureConfs = {};

				if(!params.loadConfs)
					params.loadConfs = {};

				if(!params.installConfs)
					params.installConfs = {};

				//crear los continuadores de la ejecución asincrónica
				loadCallback = new Packman.Callback(function() {
						this.install(params.installConfs)
						}, this
					);

				configureCallback = new Packman.Callback(function() {
						this.load(params.loadConfs);
						}, this
					);

				//agregar los callbacks para generar la cadena
				params.configureConfs.callback = (params.configureConfs.callback)?
					[].concat(params.configureConfs.callback, configureCallback) : configureCallback;

				params.loadConfs.callback = (params.loadConfs.callback)?
					[].concat(params.loadConfs.callback, loadCallback) : loadCallback;

				//llamar
				this.configure(params.configureConfs);
			}

			//verificar que esté instalado
			if(!this.is.installed)
				return this.install({
					callback: new Packman.Callback(function(params) {
						this.update(params);
					}, this,
					[params])
				});

			this.is.ocupy = true;

			//vaaaars de llamados
			var fname = 'update',
				mods = this.taxon.props(fname+'Mods', true, true),
				funcs = this.taxon.props(fname, true, true),
				length = funcs.length,
				i = length,
				releaser = [new Packman.Callback(function() {
					this.is.ocupy = false;
					}, this)];

			//////////////////////////////////////////////// configurar lógica de callbacks
			//agregar los callbacks al callback del pastor de callbacks
			if(params.callback)
				releaser = releaser.concat(params.callback);

			//crear shephedr de funciones
			this.functionShepherd({
				target: fname,
				number: length,
				callback: releaser
			});

			//configurar ticker del shepherd
			params.callback = new Packman.Callback(function() {
				this.functionShepherd({
					target: fname,
					number: -1
				});
			}, this);

			////////////////////////////////////////////////ejecutar funciones ascendentemente
			length -= 1;
			while(i--)
				funcs[length-i][1].call(this, params);
		}
	};
	Pack.prototype.constructor = this.Packman.Pack;

	//pack
	//recibe un PRI y retorna el paquete que más probablemente apunta
	function pack(PRI) {
		var PRIstring,
			pack;
		if(typeof PRI === 'string' || PRI instanceof String) {
			PRIstring = PRI;
			PRI = description(PRI);
		}

		if( !PRI.taxonomy.length ) {
			if(PRI.id)
				pack = pack_map[ PRI.taxonomy[0]+'#'+PRI.id ];	//sintaxis de paquete
			else
				pack = pack_map[ '.'+PRI.taxonomy.join('.') ];	//sintaxis de ordenador

			return (pack)? pack : null;
		}
		return null;
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
	function Type(taxonomy) {

		this.taxonomy = (taxonomy)? taxonomy : null;
	}
	Type.prototype.string = function string(depth, fields) {
		depth = (depth === undefined)? depth : 1;

		return '.' + this.taxonomy.slice(-depth).join('.');
	}





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

		if ( taxonomy instanceof Array ) {
			if( taxonomy[0] instanceof Type )
				this.taxonomy = taxonomy;
			else if( typeof taxonomy[0] === 'string' )
				this.taxonomy = taxon( taxonomy );
		}

		else if( typeof taxonomy === 'string' || taxonomy instanceof String )
			this.taxonomy = taxon( taxonomy );
		else
			this.taxonomy = [];

	}

	Taxon.prototype = {
		packman : null,
		//taxon(depth = 1)
		//	retorna el tipo del paquete, con depth como profundidad taxonomica
		//	depth: profundidad taxonómica (string | int)
		//		string: 'full'
		string: function(depth) {
			depth = depth || this.taxonomy.length;

			var taxonomy = this.taxonomy.map(function(type) {return type.string();});

			return '.'+taxonomy.slice(0,depth).join('.');
		},
		taxonomySimplified: function taxon(depth) {
			depth = depth || this.taxonomy.length;

			return this.taxonomy.map(function(type) {return type.string();}).slice(0,depth));
		},
		//typeof(Type)
		//	retorna true si este es tipo es subconjunto del parámetro
		typeOf: function(taxon) {
			var i = taxon.taxonomy.length;

			if(taxon.taxonomy.length > this.taxonomy.length) return false;

			for(; i--;)
				if( this.taxonomy[i] !== taxon.taxonomy[i] )
					return false;

			return true;
		},
		//props(function)
		//	rertorna una lista con las propiedades ordenadas taxonómicamente
		props: function(prop, include_meta, hash) {
			if(!prop)	return [];

			var props = [],
				i = this.taxonomy.length,
				property = null,
				metaProp = this.packman.typemap[meta_type];

		  while(i--) {
				property = this.taxonomy[i][prop];

				if(property !== undefined && property !== null)
					props.unshift( (hash)? [ this.taxonomy[i], property ] : property );
			}

			if(!!include_meta && metaProp !== undefined)
					props.unshift( (hash)? [meta_type, metaProp] : metaProp );

			return props;
		}
	};
	Taxon.prototype.constructor = this.Packman.Taxon;





	//busca el tipo mas cercano en la biblioteca al pedido
	function type( taxonomy, decremental) {
		//sanitización
		taxonomy = (taxonomy instanceof Type)? taxonomy.taxonomy : taxonomy;
		taxonomy = ( typeof taxonomy === 'string' ) taxonomy.split(.).slice(1) : taxonomy;
		decremental = decremental || false;

		//variables de iteración
		var length = taxonomy.length,
			i = (decremental)? length : 0,
			typeString,
			type;

		//iterar decremental (length a 0) o incrementalmente (0 a length-1)
		for(;
			(decremental)? i-- : i < length;
			(decremental)? void(0) : ++i ) {

			//obtener tipo con cadena de tipos inferiores o superiores al indice
			typestring = (decremental)? taxonomy.slice(0,i) : taxonomy.slice(i);
			type = TypeMap(typestring);

			//TODO?: agregar arrays de tipos con fieldsets
			if(type) return type;

		}

		return null;
	}

	//retorna la lista de tipos que corresponden a
	//una taxonomia
	function taxon( taxonomy ) {
		var length = taxonomy.length,
			i = length,
			taxon = [],
			type;

		while(i--) {
			type = type( taxonomy.slice(0,i+1) );
			if(type) taxon.unshift(type);
		}

		return taxon;
	}





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

	//dos formas de manejar los callbacks, cuando se presenta
	//una situación de múltiples funciones (que aceptan callback)
	//tras las cuales deben llamarse los callbacks:
	//
	//ejecutar todas simultáneamente, y al terminar todas ellas ejecutar el(los) callback(s)
	//ejecutar una lista de forma ascendente y al terminar la última ejecutar el(los) callback(s)

	//se ejecutaran todas las funciones simultáneamente, y al final se ejecutaran
	//los callbaccks
	function CallbacksShepherd(params) {

		this.callbacks = [];
		this.functions = [];

		this.ticker = new Callback(
			this.tickerFunction,
			this);

		if(params)	this.set(params);

	};
	//agrega funciones a la lista, o callbacks para el final, o los parámetros globales
	CallbacksShepherd.prototype = {
		set: function set(params) {

			if( params.callbacks ) this.callbacks.concat( params.callbacks );
			if( params.functions )	this.functions.concat( params.functions );

		},
		//inicia la ejecución de las funciones
		apply: function apply() {
			if(!this.functions.length || !this.callbacks.length)	return false;

			var i = this.functions.length,
					f,
					param;

			//ejecutar cada función con el ticker como su callback
			while(i--)	{
				f = this.function[i];
				param = f.params;

				//normalizar el callback
				if(param[0].toString() === '[object Object]')
					param[0].callback = this.ticker;
				else
					param[0] = {callback: this.ticker};

				f.apply();
			}

			return true;
		},
		//disminuye el contador en la unidad
		tickerFunction: function tickerFunction() {
			if(!--this.instances)
				this.end();
		},
		//ejecuta todas las funciones callbacks
		end: function end() {
			if(!this.callbacks)	return false;

			var i = this.callbacks.length;

			while(i--)
				this.callbacks[i].apply();
		}
	};
	CallbacksShepherd.prototype.constructor = FunctionShepherd;

	//se ejecutaran las funciones ascendentemente según el orden en que
	//están en el array, y al final, se ejecutaran los callbacks
	function CallbacksIterator(params) {

		this.callbacks = [];
		this.functions = [];

		this.current = 0;

		this.iterator = new Packman.Callback(
			this.iteratorFunction,
			this
		);

		if(params)	this.set(params);

	};
	CallbacksIterator.prototype = {
		set: function set(params) {

			if(params.functions)	this.functions.concat(params.functions);
			if(params.callbacks)	this.functions.concat(params.callbacks);

		};
		//inicia la iteración, retorna true si lo logra, false otherwise
		apply: function apply() {

			if(!this.functions.length)	return false;

			this.iterator.apply();

			return true;
		},
		//al ser llamado avanza el iterador y llama a la función siguiente con sigo mimso
		//como callback encapsulado, si no quedan funciones, llama la función end
		iteratorFunction: function iteratorFunction() {
			var f, param;

			if(this.current < this.functions.length ) {
				f = this.functions[this.current];
				param = f.params;

				if(param[0].toString() === '[object Object]')
					param[0].callback = this.iterator;
				else
					param[0] = {callback: this.iterator};

					f.apply();

				this.current++;
			}
			else
				this.end();

		},
		//llama todas las funciones callbacks, retorna true si lo hace, false otherwise
		end: function end() {
			if(!this.callbacks.length)	return false;

			var i = this.callbacks.length;

			while(i--)
				this.callbacks[i].apply();
		}
	}
	CallbacksIterator.prototype.constructor = FunctionIterator;




	//FieldDescriptor
	//Describe los rangos o valores aceptables para que un objeto data suponga un estado
	//
	//
	function FieldsDescriptor( descriptor ) {
		this.set(descriptor);
	}
	FieldsDescriptor.prototype = {
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

					if( thisfield.eq )
						if( thisfield.eq.indexOf(datafield) === -1 )
							return false;

					if( typeof datafield === 'number' ) {
						if( datafield <= thisfield.gt || datafield >= thisfield.lt )
							return false;
					}

					if( typeof datafield === 'string' && thisfield.regexp ) {
						return thisfield.regexp.test(datafield);
					}

				}

				//que sean iguales
				else if (thisfield !==  datafield) return false;
			}

			return true;
		},
		set: function set( description ) {

			var field,
				thisfield;

			//para cada campo existente en el descriptor
			for(field in description) if( description.hasOwnProperty(field) ) {
				thisfield = this[field] = description[field];


				//formatear objetos completos
				if( typeof thisfield === 'object' && !(thisfield instanceof Array) ) {

					//regexp
					if( typeof thisfield.regexp 'string' )
						thisfield.regexp = new RegExp( thisfield.regexp );
					if( thisfield.regexp instanceof Array )
						thisfield.regexp = new RegExp( thisfield.regexp[0], thisfield.regexp[1] );
				}
			}

		}
	}
	FieldsDescriptor.prototype.constructor = FieldsDescriptor;




	//Rpc (remote procedure call)
	//indica una configuracion de enlaces y formas de llamado
	//	url 	//dirección a la cual hacer la url
	//	format  //formato de respuesta
	//	action_prefix //prefijo que se añadira al campo action
    function Rpc() {
    	this.url = null;
    	this.format = 'json';
    	this.action_prefix = 'packman';
    }

    Rpc.prototype = {
    //call({data, callback, context})
	//	ejecuta un llamado asincrónico con la configuración
    	call : function(params) {
    		if(!jQuery || !this.url || !params.data.action || !params.data.callback)
    			return false;

    		params.data.action += (this.action_prefix)? this.action_prefix : '';

    		jQuery.post(
    			this.url,
    			params.data,
    			params.callback,
    			this.format
    			);
    	},
    //startAgglomeration()
	//indica no resolver calls sino que aglomerarlas en un solo pedido
	//endAgglomeration()
	//indica disparar todos los pedidos de llamados
    };
    Rpc.prototype.constructor = this.Packman.Rpc;

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
		this.pack = new RootPack();
		this.root_type = new RootPackType();
		this.type = new MetaType();
	}

	///////////////////////////////////////////////////////Built-in objects
	builtin = (function () {

		var meta;

		meta = (function(){

			var html,
				script;

			html = new MetaData();

			html.type.configure = function() {

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

	return {
		Dep: Dep,
		Pack: Pack,
		Type: Type,
		Taxon: Taxon,
		Rpc: Rpc,
		builtin: builtin
	};
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
//{} = JSON.stringify(fieldObj)
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
