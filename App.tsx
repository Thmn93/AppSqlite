import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Banco, createTable, inserirUsuario, selectUsuarios, selectUsuarioId, deletaUsuario } from './Conf/Bd'
import React, { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    async function Main () {
      const rbd = await Banco()
      
        await createTable(rbd)

     
       await inserirUsuario(rbd, 'Sophiaaaaaa', 'e@gmail.com')
        const campos = await selectUsuarios(rbd)
        for (const reg of campos as [{ID_US: number, NOME_US: string, EMAIL_US: string}]) {
          console.log(reg.ID_US, reg.NOME_US, reg.EMAIL_US)    
        }
      
        console.log('-----------------------------')
        const campoId = await selectUsuarioId(rbd,2) as {ID_US: number, NOME_US: string, EMAIL_US: string}
        console.log(campoId.ID_US, campoId.NOME_US, campoId.EMAIL_US)             
       


        console.log('-----------------------------')
        await deletaUsuario(rbd, 5)

      const campo = await selectUsuarios(rbd);
      for (const reg of campo as [{ID_US: number, NOME_US: string, EMAIL_US: string}]) {
        console.log(reg.ID_US, reg.NOME_US, reg.EMAIL_US)
      }
    }

      
    Main()
  }, [])


  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});