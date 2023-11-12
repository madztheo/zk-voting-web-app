# Katz

Katz lets you vote for your favorite candidate with greater anonymity. By leveraging recursive proofs with o1js and using Mina to settle the election results on-chain, your vote is kept private from the rest of the public while the overall election results can be known by anyone.

### Credits

This project is based on some example code from the docs of Mina and o1js that can be found [here](https://docs.minaprotocol.com/).

Also the code in the directory `contracts/src/voting/` is based on the code from Florian of O1Labs that can be found [here](https://github.com/Trivo25/offchain-voting-poc). I modified it to fit my use case with a different data structure to keep track of the candidates vs of proposals as it was originally implemented in Florian's repo.

This project was built during ZK Hack Istanbul 2023, and I would also like to thanks the team of O1Labs for assisting me during the hackathon with any questions and issues I had.
