import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BoussoleFret IA Desktop',
      theme: ThemeData.light(),
      home: const Scaffold(
        body: Center(child: Text('Desktop skeleton - à implémenter')),
      ),
    );
  }
}
