# packman
The abstract js package manager for big and modular SPA´s.
(Think of it like package management in unix systems, think of pages has OS´s)

Aimed to be used with other current web programing tools like Angular, Component or Polygon it allows you to split your SPA or general application into installable packages with dependency resolution, that way, you can split your SPA into main section packages, and the content in those sections (probably maped to a REST api too) as content type packages, that are loaded and handle their installation on ther own, on the place or places they have to be included. Forget about repetitive ajax calls sections, or static site structures, or poorly structured SPA, just define what content to retrieve in the content or data requests of pakages, and specify the type of package your packman will handle.

To allow further customization and DRY filosofy, you can define new types of packages, specify ther behaviour, and implement them in your own taxonomy tree. Then just asociate your packages with their type or types, and just do 'install'!, how they get configured, loaded, and installed, will be determined by the functions you define in their associated types!(plus the main meta-type object of your packman has a basis).

That way, packman its a multicontent manager, the basic behavior of a packman its determined by a meta-type (default behavior of all packages) and a root-package (the depency all packages have and its installed when the packman initializes), given both of them, packman has a defined type of content has target. Basic configurations for content include, script, and html, but a lot more can be added!. It is even posible to have another packman managing all of your packman objects!.

There is a long work to do, can you help me? university its a time-leecher, and it is still in an extremly basic stage, just a long script XD.
Currently, the main structure is set up. Its necesary to implement the type resolution flags (overwritte, block scripts from type a, etc), multi packman support, and lots of addings, plus documentation.

Have a suggestion?, just tell me ;)

