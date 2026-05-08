package main

import (
	"flag"
	"fmt"
	"runtime"
)

var version = "dev"

func main() {
	showVersion := flag.Bool("version", false, "print version")
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		return
	}

	fmt.Println("name: aicc")
	fmt.Printf("version: %s\n", version)
	fmt.Printf("goos: %s\n", runtime.GOOS)
	fmt.Printf("goarch: %s\n", runtime.GOARCH)
}
