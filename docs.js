const Docma = require("docma");

new Docma().build({
    app: {
        title: "Discord.js LavaLink",
        base: "/discord.js-lavalink",
        entrance: "content:readme",
        routing: "query",
        server: Docma.ServerType.GITHUB
    },
    template: {
        path: "zebra",
        options: {
            title: {
                label: "Discord.js LavaLink",
                href: "/discord.js-lavalink?"
            },
            sidebar: {
                enabled: true,
                outline: "tree",
                collapsed: false,
                toolbar: true,
                itemsFolded: false,
                itemsOverflow: "crop",
                badges: true,
                search: true,
                animations: true
            },
            symbols: {
                autoLink: true,
                params: "list",
                enums: "list",
                props: "list",
                meta: false
            },
            navbar: {
                enabled: true,
                fixed: true,
                dark: false,
                animations: true,
                menu: [
                    {
                        label: "Readme",
                        href: "?content=readme"
                    },
                    {
                        label: "Documentation",
                        href: "?api=lavalink",
                        iconClass: "fas fa-book"
                    },
                    {
                        iconClass: "fab fa-lg fa-github",
                        label: "",
                        href: "https://github.com/MrJacz/discord.js-lavalink",
                        target: "_blank"
                    }
                ]
            }
        }
    },
    markdown: {
        gfm: true,
        tables: true,
        breaks: true,
        pedantic: true,
        sanitize: true,
        smartLists: true,
        smartypants: true,
        tasks: true,
        emoji: true
    },
    src: [
        { readme: "./README.md" },
        { lavalink: "./src/*/**/**/*.js" }
    ],
    dest: "./docs",
    debug: 31,
    jsdoc: { package: "./package.json" }
})
    .catch(console.error);
