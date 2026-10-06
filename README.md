# Logos

Biblioteca-oficina pessoal para guardar, escrever, organizar e consumir textos
em Markdown.

```text
Collection (opcional, como uma pasta)
└── Project
    └── Text
        └── Text variation (opcional)
```

O mesmo Project pode ser copiado como Markdown, lido no app ou gerado como
EPUB. Um EPUB externo também pode ser inspecionado, limpo e convertido em
Project.

O caminho principal deve permanecer:

```text
+ -> escrever ou colar -> salvar
```

Veja a [documentação](docs/README.md).

## Estado

A primeira biblioteca e o editor Markdown estão implementados sobre a fundação
Django/Next do App Creator. Reader, arquivos EPUB e upload de imagens vêm nas
próximas rodadas. Veja [como executar](docs/development.md).

O legado permanece intacto em:

- frontend: `/Users/diogo/Development/monorepo/front/logos`;
- backend: `/Users/diogo/Development/monorepo/back/publications`;
- identidades: `/Users/diogo/Development/monorepo/back/profiles`.
