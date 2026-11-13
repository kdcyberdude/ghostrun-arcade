// Lossless frame-indexed native picture stream; uses the same POWER-ON loop as native-poweron.cpp.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){
 if(argc!=4){std::cerr<<"usage: native-poweron-pixels ROM PADS OUT_DIRECTORY\n";return 2;}
 std::ifstream romFile(argv[1],std::ios::binary),padFile(argv[2],std::ios::binary);if(!romFile||!padFile)return 3;
 const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(romFile)),{}),pads((std::istreambuf_iterator<char>(padFile)),{});
 rle::HostMachine machine(rom);
 std::ofstream ram(std::string(argv[3])+"/ram.bin",std::ios::binary),pixels(std::string(argv[3])+"/pixels.bin",std::ios::binary),emphasis(std::string(argv[3])+"/emph.bin",std::ios::binary);
 if(!ram||!pixels||!emphasis)return 4;
 std::vector<unsigned char> pix(240*224),emph(224);
 for(std::size_t frame=0;frame<pads.size();++frame){
  const auto fault=machine.frame(pads[frame]);if(fault){std::cerr<<"native CPU fault "<<fault<<" at PPU frame "<<frame<<'\n';return 5;}
  ram.write(reinterpret_cast<char*>(machine.b.cpu.ram),2048);
  rlm::render_obs(machine.b,0,pix.data(),emph.data());
  pixels.write(reinterpret_cast<char*>(pix.data()),pix.size());emphasis.write(reinterpret_cast<char*>(emph.data()),emph.size());
 }
 ram.close();pixels.close();emphasis.close();return ram&&pixels&&emphasis?0:6;
}
