# Calculatrice Scientifique Interactive

Projet réalisé dans le cadre du module **Programmation JavaScript**.

## Stack technique
- **HTML5** — structure de l'interface (`index.html`)
- **CSS3** — design responsive (`css/style.css`)
- **JavaScript** — logique et interactions (`js/script.js`)

## Fonctionnalités
- Opérations de base : `+  −  ×  ÷`
- Fonctions scientifiques : `sin, cos, tan, log, ln, √, x!, xʸ`
- Constantes : `π`, `e`
- Bascule **RAD / DEG**
- Mémoire : `m+`, `mr`, `mc`
- Parenthèses et priorité des opérateurs gérées par un parseur maison (aucun `eval()`)
- Support clavier physique et tactile
- Interface responsive (mobile / desktop)

## Lancer le projet en local
Aucune dépendance à installer : ouvrez simplement `index.html` dans un navigateur,
ou servez le dossier avec un petit serveur statique :

```bash
npx serve .
```

## Déploiement (Vercel / Netlify / Render)
1. Poussez ce dossier sur un dépôt GitHub.
2. Sur [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) : "New Project" →
   importer le dépôt → laisser les réglages par défaut (site statique, pas de build) → Deploy.
3. Récupérez l'URL publique fournie et joignez-la, avec le lien du dépôt GitHub,
   dans le PDF/feuille de rendu (Nom + Matricule).

## Structure du projet
```
calculatrice/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
└── README.md
```
