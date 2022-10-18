const Game = {
    list: (req,res)=>{
        res.status(200).json({data:'Listando Juegos Populares'})
    },
    get: (req,res)=>{
        res.status(200).send('Buscando Juego')
    }
}

module.exports = Game