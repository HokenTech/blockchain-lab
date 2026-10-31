#!/bin/bash
# Installa il compilatore (cdt-cpp) e il client (cleos) di EOS/Antelope in un GitHub Codespace (Ubuntu).
# Uso, nel terminale del Codespace:  bash setup.sh
set -e
cd /tmp
wget -q https://github.com/AntelopeIO/cdt/releases/download/v4.1.1/cdt_4.1.1-1_amd64.deb \
        https://github.com/AntelopeIO/spring/releases/download/v1.2.2/antelope-spring_1.2.2_amd64.deb
sudo apt-get update -qq
sudo apt-get install -y -qq ./cdt_4.1.1-1_amd64.deb ./antelope-spring_1.2.2_amd64.deb
cd - >/dev/null
echo
cdt-cpp --version
cleos version client
echo
echo "Fatto. Prossimi passi:"
echo "  npx @wharfkit/cli account -n NOMESCELTO.gm | tee ~/account.txt"
echo "  cd contract/notaio && cdt-cpp -abigen -o notaio.wasm notaio.cpp"
