// Standalone POWER-ON observer using the rollout build's exact HostMachine.
// Build with the lab rl/csrc and NeSLE include paths; no boot snapshot or env.start.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){
 if(argc!=4){std::cerr<<"usage: native-poweron ROM PADS OUT_DIRECTORY\n";return 2;}
 std::ifstream romFile(argv[1],std::ios::binary),padFile(argv[2],std::ios::binary);
 if(!romFile||!padFile)return 3;
 const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(romFile)),{}),pads((std::istreambuf_iterator<char>(padFile)),{});
 rle::HostMachine machine(rom);
 std::ofstream initial(std::string(argv[3])+"/initial.ram",std::ios::binary),ram(std::string(argv[3])+"/ram.bin",std::ios::binary);
 if(!initial||!ram)return 4;
 initial.write(reinterpret_cast<char*>(machine.b.cpu.ram),2048);initial.close();
 for(std::size_t frame=0;frame<pads.size();++frame){
  const auto fault=machine.frame(pads[frame]);
  if(fault){std::cerr<<"native CPU fault "<<fault<<" at PPU frame "<<frame<<'\n';return 5;}
  ram.write(reinterpret_cast<char*>(machine.b.cpu.ram),2048);
 }
 ram.close();if(!ram)return 6;
 std::cout<<pads.size()<<'\n';
}
