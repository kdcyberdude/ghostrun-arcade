// One-time HUD nametable readouts at requested POWER-ON PPU frame boundaries.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <set>
int main(int argc,char** argv){
 if(argc!=5){std::cerr<<"usage: native-poweron-hud ROM PADS TARGET_FRAMES OUT_DIRECTORY\n";return 2;}
 std::ifstream romFile(argv[1],std::ios::binary),padFile(argv[2],std::ios::binary),targetsFile(argv[3]);if(!romFile||!padFile||!targetsFile)return 3;
 const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(romFile)),{}),pads((std::istreambuf_iterator<char>(padFile)),{});
 std::set<std::size_t> targets;for(std::size_t frame;targetsFile>>frame;)targets.insert(frame);
 rle::HostMachine machine(rom);std::ofstream ram(std::string(argv[4])+"/ram.bin",std::ios::binary),hud(std::string(argv[4])+"/hud.json");if(!ram||!hud)return 4;
 hud<<'[';bool first=true;std::size_t written=0;
 for(std::size_t frame=0;frame<pads.size();++frame){
  if(const auto fault=machine.frame(pads[frame])){std::cerr<<"native CPU fault "<<fault<<" at PPU frame "<<frame<<'\n';return 5;}
  ram.write(reinterpret_cast<char*>(machine.b.cpu.ram),2048);if(!targets.contains(frame))continue;
  if(!first)hud<<',';first=false;written++;hud<<"{\"frame\":"<<frame;
  const auto* nt=machine.b.ppu.nametable_ram;
  const auto field=[&](const char* name,int address,int length){hud<<",\""<<name<<"\":[";for(int i=0;i<length;i++){if(i)hud<<',';hud<<unsigned(nt[address+i]);}hud<<']';};
  field("score",0x63,6);field("coins",0x6d,2);field("time",0x7a,3);hud<<'}';
 }
 hud<<"]\n";ram.close();hud.close();if(written!=targets.size()){std::cerr<<"target PPU frame outside pad stream\n";return 6;}return ram&&hud?0:7;
}
