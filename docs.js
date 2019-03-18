const Docma = require("docma");
const Package = require("./package");

Docma.create()
    .build({
        app: {
            title: Package.name,
            base: "/discord.js-lavalink",
            entrance: "content:readme",
            routing: "query",
            server: Docma.ServerType.GITHUB
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
            { lavalink: "./dist/*/**/*.js" }
        ],
        dest: "./docs",
        jsdoc: { plugins: ["jsdoc-dynamic"] },
        template: {
            options: {
                title: Package.name,
                navItems: [
                    {
                        label: "Readme",
                        href: "?content=readme"
                    },
                    {
                        label: "Documentation",
                        href: "?api=lavalink",
                        iconClass: "ico-book"
                    },
                    {
                        label: "GitHub",
                        href: Package.homepage,
                        target: "_blank",
                        iconClass: "ico-md ico-github"
                    }
                ],
                navbar: {
                    dark: true
                }
            }
        }
    })
    .catch(console.error);
