# Pendências

Esta lista orienta próximas decisões, sem impor etapas ou ordem de implementação.
Concluir ou abandonar um item exige removê-lo; não converter a lista em histórico.

## Recursos ainda sem implementação completa

- Snackbar compartilhado e filtros da Biblioteca.
- Capa própria e ordenação dos livros nas coleções, mantendo capa e nome por item.
- Gestão de arquivos: upload, copiar endereço e excluir; associação das imagens
  relativas nos Markdown importados.
- Recuperação de jobs interrompidos; processamento assíncrono quando necessário.
- Validação com EPUBCheck e avaliação de compatibilidade Kindle.

## Direções a avaliar pelo uso

- Estudo e laterais redimensionáveis.
- Opções de idioma e tratamento de conteúdo especializado.
- Áudio e links de vídeo no livro, considerados para MVP3.

## Próximos MVPs de leitura

- `/kindle`: experiência leve para o navegador do Kindle físico, aproveitando
  a proposta do legado, com pouco JavaScript. Não exigir EPUB.js; validar no aparelho.
- `/mobile`: biblioteca com capas e leitor EPUB em página inteira, reutilizando
  o motor do modal. Incluir continuar leitura, tamanho da fonte e tema; usar o
  EPUB do grupo principal como escolha inicial e oferecer outras versões discretamente.
- PWA de leitura em `/mobile`: instalação e, numa rodada posterior, download
  para leitura offline, com atualização dos arquivos e armazenamento privado definidos.

As experiências compartilham livros e backend com Trabalho; não duplicar projetos
nem grupos para atender cada dispositivo. A ordem dos MVPs segue o uso.

Ajustes de layout seguem o uso real e o padrão do app; não são um projeto de
estilos por página.
