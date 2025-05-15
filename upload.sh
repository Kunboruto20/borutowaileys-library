#!/bin/bash

# Setare email și nume
git config --global user.name "gyovannyvpn123"
git config --global user.email "mdanut159@gmail.com"

# Verifică dacă este git repo
if [ ! -d .git ]; then
    git init
fi

# Cere token GitHub
read -sp "Introduceți GitHub Personal Access Token: " token
echo

# Setare remote GitHub
git remote remove origin 2> /dev/null
git remote add origin https://gyovannyvpn123:$token@github.com/gyovannyvpn123/borutowaileys-library.git

# Adaugă fișierele
git add .

# Commit cu mesaj
git commit -m "Upload initial Borutobotwappnodark"

# Push la repo
git branch -M main
git push -u origin main
