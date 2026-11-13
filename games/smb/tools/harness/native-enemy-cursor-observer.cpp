// Read-only instruction observer over the exact HostMachine power-on replay.
// Build: c++ -O2 -std=c++20 -ffp-contract=off -I LAB/rl/csrc -I LAB/.cache/nesle-src/cpp/include \
// tools/harness/native-enemy-cursor-observer.cpp LAB/.cache/nesle-src/cpp/src/rom.cpp -o /tmp/native-enemy-cursor-observer
// ROM PADS EXPECTED_RAM OUT_JSONL [MAX_FRAMES]. Every completed PPU RAM row must match.
#include "native-enemy-cursor-observer.hpp"
#include <iostream>
#include <iterator>
std::vector<std::uint8_t> readBytes(const char* p){std::ifstream in(p,std::ios::binary);if(!in)throw std::runtime_error(p);return {(std::istreambuf_iterator<char>(in)),{}};}
int main(int argc,char** argv){try{
 if(argc<5||argc>6)throw std::runtime_error("ROM PADS EXPECTED_RAM OUT_JSONL [MAX_FRAMES]");
 const auto rom=readBytes(argv[1]),pads=readBytes(argv[2]);std::ifstream expected(argv[3],std::ios::binary);if(!expected)throw std::runtime_error("Expected RAM unavailable");
 rle::HostMachine m(rom);if(m.mode!=0)throw std::runtime_error("NROM required");NativeEnemyCursorObserver observer(m.b,m.prg,argv[4]);std::uint8_t reference[2048];
 const auto last=argc==6?std::min<std::size_t>(pads.size(),std::stoull(argv[5])):pads.size();
 for(std::size_t frame=0;frame<last;frame++){
  observer.step(pads[frame],m.target);m.target+=rlm::kFrameDots;
  expected.read(reinterpret_cast<char*>(reference),2048);if(!expected||std::memcmp(reference,m.b.cpu.ram,2048))throw std::runtime_error("Native prefix mismatch row"+std::to_string(frame));
 }
 std::cout<<"{\"verifiedRows\":"<<last<<",\"attempts\":"<<observer.calls<<",\"initializers\":"<<observer.initialized<<"}\n";
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
